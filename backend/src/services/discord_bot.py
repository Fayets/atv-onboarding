import asyncio
import logging
import sys
import threading
from datetime import datetime
from typing import Any

import discord
import httpx
from decouple import config
from discord import app_commands

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"


def _configure_discord_bot_logging() -> None:
    root = logging.getLogger()
    if not root.handlers:
        logging.basicConfig(
            level=logging.INFO,
            format=LOG_FORMAT,
            stream=sys.stdout,
        )

    bot_logger = logging.getLogger(__name__)
    if not any(isinstance(h, logging.StreamHandler) for h in bot_logger.handlers):
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)
        handler.setFormatter(logging.Formatter(LOG_FORMAT))
        bot_logger.addHandler(handler)
    bot_logger.setLevel(logging.INFO)


_configure_discord_bot_logging()
logger = logging.getLogger(__name__)

PLAN_CATEGORY_PATTERNS = {
    "Boost": "canales atv boost",
    "Mentoría": "canales atv mentoria",
    "Advantage": "canales atv advantage",
}

PLAN_ROLE_NAMES = {
    "Boost": "Boost",
    "Mentoría": "Principiantes",
    "Advantage": "Advantage",
}

invite_uses_snapshot: dict[str, int] = {}


def _config(name: str, default: str = "") -> str:
    return config(name, default=default).strip()


def _find_category(guild: discord.Guild, plan: str) -> discord.CategoryChannel | None:
    pattern = PLAN_CATEGORY_PATTERNS.get(plan, "").lower()
    if not pattern:
        return None

    for category in guild.categories:
        if pattern in category.name.lower():
            return category
    return None


def _staff_overwrites(
    guild: discord.Guild,
) -> dict[Any, discord.PermissionOverwrite]:
    overwrites: dict[Any, discord.PermissionOverwrite] = {
        guild.default_role: discord.PermissionOverwrite(view_channel=False),
        guild.me: discord.PermissionOverwrite(
            view_channel=True,
            send_messages=True,
            manage_channels=True,
        ),
    }

    for env_key in ("DISCORD_STAFF_NICK_ID", "DISCORD_STAFF_ALE_ID"):
        staff_id = _config(env_key)
        if not staff_id:
            continue
        member = guild.get_member(int(staff_id))
        if member:
            overwrites[member] = discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
            )

    return overwrites


def _format_datetime(value: datetime | str) -> str:
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    return value.strftime("%d/%m/%Y, %H:%M:%S")


def _build_success_embed(
    name: str,
    email: str,
    plan: str,
    password: str,
    expires_at: str,
) -> discord.Embed:
    embed = discord.Embed(
        title="ONBOARDING ENVIADO! ✅",
        description=(
            "El acceso fue creado y enviado correctamente. El cliente ya recibió su "
            "correo con la contraseña y las invitaciones a Discord y Skool. Tiene 24 "
            "horas para ingresar antes de que el acceso expire automáticamente."
        ),
        color=0xE63946,
    )
    embed.add_field(name="👤 Nombre", value=name, inline=True)
    embed.add_field(name="📧 Email", value=email, inline=True)
    embed.add_field(name="🎯 Plan", value=plan, inline=True)
    embed.add_field(name="🔑 Contraseña", value=password, inline=True)
    embed.add_field(name="📅 Expira", value=_format_datetime(expires_at), inline=True)
    embed.add_field(
        name="📨 Fecha de envío",
        value=_format_datetime(datetime.now()),
        inline=True,
    )
    return embed


async def _assign_role_for_invite(member: discord.Member, invite_code: str) -> None:
    api_base = _config("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    admin_key = _config("ADMIN_API_KEY")
    if not admin_key:
        logger.warning("ADMIN_API_KEY no configurada; no se asigna rol.")
        return

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{api_base}/api/admin/sessions/by-invite-code/{invite_code}",
                headers={"X-Admin-Key": admin_key},
            )
            if resp.status_code == 404:
                return
            if resp.status_code != 200:
                logger.error(
                    "Error al buscar sesión por invite %s: %s",
                    invite_code,
                    resp.text,
                )
                return

            data = resp.json()
            if data.get("role_assigned"):
                return

            plan = data.get("plan")
            role_name = PLAN_ROLE_NAMES.get(plan)
            if not role_name:
                logger.warning("Plan sin rol mapeado: %s", plan)
                return

            role = discord.utils.get(member.guild.roles, name=role_name)
            if not role:
                logger.warning("Rol no encontrado en el servidor: %s", role_name)
                return

            await member.add_roles(role, reason=f"Onboarding ATV ({plan})")

            patch_resp = await client.patch(
                f"{api_base}/api/admin/sessions/{data['session_id']}/role-assigned",
                headers={"X-Admin-Key": admin_key},
            )
            if patch_resp.status_code != 200:
                logger.error(
                    "Error al marcar role_assigned para sesión %s: %s",
                    data.get("session_id"),
                    patch_resp.text,
                )
            else:
                logger.info(
                    "Rol %s asignado a %s (invite %s)",
                    role_name,
                    member.display_name,
                    invite_code,
                )
    except Exception:
        logger.exception("Error en _assign_role_for_invite")


class ATVDiscordBot(discord.Client):
    def __init__(self, guild_id: int):
        intents = discord.Intents.default()
        intents.guilds = True
        intents.members = True
        super().__init__(intents=intents)
        self.guild_id = guild_id
        self.tree = app_commands.CommandTree(self)
        logger.info(
            "Discord bot intents: members=%s guilds=%s",
            intents.members,
            intents.guilds,
        )

    async def setup_hook(self) -> None:
        guild = discord.Object(id=self.guild_id)
        self.tree.copy_global_to(guild=guild)
        await self.tree.sync(guild=guild)

    async def on_ready(self) -> None:
        guild_ids = [g.id for g in self.guilds]
        logger.info(
            "Bot conectado como %s, guilds: %s (target guild: %s)",
            self.user,
            guild_ids,
            self.guild_id,
        )

    async def on_member_join(self, member: discord.Member) -> None:
        logger.info(
            "on_member_join disparado para: %s (guild %s)",
            member.name,
            member.guild.id,
        )

        try:
            if member.guild.id != self.guild_id:
                logger.info(
                    "on_member_join ignorado: guild %s != target guild %s",
                    member.guild.id,
                    self.guild_id,
                )
                return

            logger.info(
                "on_member_join: obteniendo invites del guild %s...",
                member.guild.id,
            )
            invites = await member.guild.invites()
            logger.info(
                "on_member_join: guild.invites() devolvió %s invite(s)",
                len(invites),
            )

            for invite in invites:
                prev = invite_uses_snapshot.get(invite.code)
                logger.info(
                    "on_member_join: invite code=%s uses=%s snapshot=%s",
                    invite.code,
                    invite.uses,
                    prev,
                )
                if prev is not None and invite.uses is not None and invite.uses > prev:
                    invite_uses_snapshot[invite.code] = invite.uses
                    logger.info(
                        "on_member_join: invite usado detectado, asignando rol (%s)",
                        invite.code,
                    )
                    await _assign_role_for_invite(member, invite.code)
                    break
            else:
                logger.info(
                    "on_member_join: ningún invite trackeado coincidió para %s",
                    member.name,
                )
        except Exception:
            logger.exception("Error en on_member_join")


def _build_bot(guild_id: int) -> ATVDiscordBot:
    bot = ATVDiscordBot(guild_id=guild_id)

    @bot.tree.command(
        name="add-client",
        description="Crea un onboarding y canal privado para un cliente",
    )
    @app_commands.describe(
        name="Nombre del cliente",
        email="Email del cliente",
        plan="Plan contratado",
    )
    @app_commands.choices(
        plan=[
            app_commands.Choice(name="Boost", value="Boost"),
            app_commands.Choice(name="Mentoría", value="Mentoría"),
            app_commands.Choice(name="Advantage", value="Advantage"),
        ]
    )
    async def add_client(
        interaction: discord.Interaction,
        name: str,
        email: str,
        plan: app_commands.Choice[str],
    ) -> None:
        allowed_channel = _config("DISCORD_CHANNEL_ENVIAR")
        if not allowed_channel or str(interaction.channel_id) != allowed_channel:
            await interaction.response.send_message(
                "Este comando solo puede usarse en el canal autorizado.",
                ephemeral=True,
            )
            return

        api_base = _config("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
        admin_key = _config("ADMIN_API_KEY")
        if not admin_key:
            await interaction.response.send_message(
                "ADMIN_API_KEY no configurada en el servidor.",
                ephemeral=True,
            )
            return

        await interaction.response.defer()

        plan_value = plan.value

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                create_resp = await client.post(
                    f"{api_base}/api/admin/add-client",
                    headers={"X-Admin-Key": admin_key},
                    json={"name": name, "email": email, "plan": plan_value},
                )
                if create_resp.status_code != 200:
                    detail = create_resp.json().get("detail", create_resp.text)
                    await interaction.followup.send(
                        f"Error al crear el cliente: {detail}",
                        ephemeral=True,
                    )
                    return

                data = create_resp.json()
                session_id = data["session_id"]
                channel_slug = data["channel_slug"]
                password = data["password"]
                expires_at = data["expires_at"]

                if not interaction.guild:
                    await interaction.followup.send(
                        "No se pudo acceder al servidor de Discord.",
                        ephemeral=True,
                    )
                    return

                category = _find_category(interaction.guild, plan_value)
                if not category:
                    await interaction.followup.send(
                        f"No se encontró la categoría para el plan {plan_value}.",
                        ephemeral=True,
                    )
                    return

                overwrites = _staff_overwrites(interaction.guild)
                discord_channel = await interaction.guild.create_text_channel(
                    name=channel_slug,
                    category=category,
                    overwrites=overwrites,
                    reason=f"Onboarding cliente {name}",
                )

                invite = await discord_channel.create_invite(
                    max_uses=1,
                    max_age=86400,
                    unique=True,
                    reason=f"Invite onboarding {name}",
                )
                invite_uses_snapshot[invite.code] = 0

                patch_resp = await client.patch(
                    f"{api_base}/api/admin/sessions/{session_id}/discord-channel",
                    headers={"X-Admin-Key": admin_key},
                    json={
                        "discord_channel_id": str(discord_channel.id),
                        "discord_invite_url": invite.url,
                    },
                )
                if patch_resp.status_code != 200:
                    detail = patch_resp.json().get("detail", patch_resp.text)
                    await interaction.followup.send(
                        f"Cliente creado pero falló guardar el canal: {detail}",
                        ephemeral=True,
                    )
                    return

            await interaction.followup.send(
                embed=_build_success_embed(
                    name=name,
                    email=email,
                    plan=plan_value,
                    password=password,
                    expires_at=expires_at,
                )
            )
        except Exception as exc:
            logger.exception("Error en /add-client")
            await interaction.followup.send(
                f"Error inesperado: {exc}",
                ephemeral=True,
            )

    return bot


async def _run_bot(token: str, guild_id: int) -> None:
    bot = _build_bot(guild_id)
    await bot.start(token)


def start_discord_bot_thread() -> threading.Thread | None:
    token = _config("DISCORD_BOT_TOKEN")
    guild_id = _config("DISCORD_GUILD_ID")

    if not token or not guild_id:
        logger.info(
            "Discord bot no iniciado: DISCORD_BOT_TOKEN o DISCORD_GUILD_ID no configurados."
        )
        return None

    def run() -> None:
        try:
            asyncio.run(_run_bot(token, int(guild_id)))
        except Exception:
            logger.exception("Discord bot terminó con error")

    thread = threading.Thread(target=run, daemon=True, name="discord-bot")
    thread.start()
    logger.info("Discord bot iniciado en thread daemon.")
    return thread
