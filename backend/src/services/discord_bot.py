import asyncio
import logging
import os
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
logger.info("=== discord_bot.py cargado (pid=%s) ===", os.getpid())

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

WELCOME_SCRIPT_FIELD_NAME = (
    "📋 Script de bienvenida — copiá y pegá en el canal del cliente"
)
DISCORD_EMBED_FIELD_VALUE_MAX = 1024


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


def _channel_overwrites(
    guild: discord.Guild,
    plan: str,
) -> dict[Any, discord.PermissionOverwrite]:
    overwrites: dict[Any, discord.PermissionOverwrite] = {
        guild.default_role: discord.PermissionOverwrite(view_channel=False),
        guild.me: discord.PermissionOverwrite(
            view_channel=True,
            send_messages=True,
            manage_channels=True,
        ),
    }

    role_name = PLAN_ROLE_NAMES.get(plan)
    if role_name:
        plan_role = discord.utils.get(guild.roles, name=role_name)
        if plan_role:
            overwrites[plan_role] = discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
                read_message_history=True,
            )
        else:
            logger.warning("Rol de plan no encontrado en el servidor: %s", role_name)

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


def _build_welcome_script(name: str) -> str:
    return (
        f"@{name}, este es tu canal privado dentro de ATV. Acá vas a tener seguimiento "
        f"directo con el equipo durante el programa. Cualquier duda, avance o entrega, "
        f"la podés traer por acá.\n"
        "ONBOARDING OBLIGATORIO — hacerlo hoy\n"
        "Paso 1 — Revisá tu mail\n"
        "\n"
        "Te llegó un correo de ATV con:\n"
        "\n"
        "Link al onboarding\n"
        "Tu contraseña de acceso (válida 24 horas)\n"
        "\n"
        "Paso 2 — Completá el onboarding\n"
        "\n"
        "Entrá al link, iniciá sesión y recorré todos los pasos hasta el final:\n"
        "\n"
        "Bienvenida y cómo trabajamos\n"
        "Video de bienvenida (obligatorio verlo completo)\n"
        "Unirte a Discord y activar tu invitación a Skool\n"
        "Completar tu perfil (formulario)\n"
        "Revisar próximos pasos\n"
        "\n"
        "Paso 3 — Después del onboarding\n"
        "\n"
        "Una vez que termines todo:\n"
        "\n"
        "Presentate en este canal (quién sos y qué querés lograr)\n"
        "Vamos a coordinar la primera sesión por acá, avisanos cuando hayas completado "
        "todo y te enviamos el link de Calendly [juan/ale]\n"
        "\n"
        "Si algo no te llega al mail o la contraseña expiró, avisame acá y lo resolvemos.\n"
        "\n"
        "¡Bienvenido a ATV!"
    )


def _build_success_embed(
    name: str,
    email: str,
    plan: str,
    password: str,
    expires_at: str,
) -> tuple[discord.Embed, str | None]:
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

    welcome_script = _build_welcome_script(name)
    script_overflow: str | None = None
    if len(welcome_script) <= DISCORD_EMBED_FIELD_VALUE_MAX:
        embed.add_field(
            name=WELCOME_SCRIPT_FIELD_NAME,
            value=welcome_script,
            inline=False,
        )
    else:
        script_overflow = welcome_script

    return embed, script_overflow


def _invite_code_from_url(url: str | None) -> str | None:
    if not url:
        return None
    code = url.rstrip("/").split("/")[-1]
    return code or None


async def _fetch_pending_role_sessions() -> list[dict]:
    api_base = _config("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    admin_key = _config("ADMIN_API_KEY")
    if not admin_key:
        logger.warning("ADMIN_API_KEY no configurada; no se consultan sesiones pendientes.")
        return []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{api_base}/api/admin/sessions/pending-role-assignment",
                headers={"X-Admin-Key": admin_key},
            )
            if resp.status_code != 200:
                logger.error(
                    "Error al obtener sesiones pendientes de rol: %s",
                    resp.text,
                )
                return []
            return resp.json().get("sessions", [])
    except Exception:
        logger.exception("Error al consultar sesiones pendientes de rol")
        return []


async def _fetch_guild_channel(
    guild: discord.Guild,
    channel_id: int,
) -> discord.abc.GuildChannel | None:
    channel = guild.get_channel(channel_id)
    if channel is not None:
        return channel
    try:
        return await guild.fetch_channel(channel_id)
    except discord.NotFound:
        return None


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

            bot_member = member.guild.me
            if bot_member:
                logger.info(
                    "Intentando asignar rol '%s' (id=%s) a %s. Roles del bot: %s, "
                    "posición del rol del bot vs target: bot_top_role=%s (pos %s), "
                    "target_role=%s (pos %s)",
                    role.name,
                    role.id,
                    member.display_name,
                    [r.name for r in bot_member.roles],
                    bot_member.top_role.name,
                    bot_member.top_role.position,
                    role.name,
                    role.position,
                )
            else:
                logger.warning(
                    "member.guild.me es None al intentar asignar rol '%s' a %s",
                    role.name,
                    member.display_name,
                )

            await member.add_roles(role, reason=f"Onboarding ATV ({plan})")

            fresh_member = await member.guild.fetch_member(member.id)
            role_names_after = [r.name for r in fresh_member.roles]
            logger.info(
                "Roles de %s después de add_roles: %s",
                member.display_name,
                role_names_after,
            )

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
            "Bot conectado como %s, guilds: %s (target guild: %s, bot_id=%s, pid=%s)",
            self.user,
            guild_ids,
            self.guild_id,
            id(self),
            os.getpid(),
        )

    async def on_member_join(self, member: discord.Member) -> None:
        logger.info(
            "on_member_join disparado para: %s (guild %s, bot_id=%s, pid=%s)",
            member.name,
            member.guild.id,
            id(self),
            os.getpid(),
        )

        try:
            if member.guild.id != self.guild_id:
                logger.info(
                    "on_member_join ignorado: guild %s != target guild %s",
                    member.guild.id,
                    self.guild_id,
                )
                return

            guild_invites = await member.guild.invites()
            guild_codes = [invite.code for invite in guild_invites]
            logger.info(
                "on_member_join: guild.invites() devolvió %s invite(s), codes=%s",
                len(guild_invites),
                guild_codes,
            )

            pending_sessions = await _fetch_pending_role_sessions()
            logger.info(
                "on_member_join: %s sesión(es) pendiente(s) de asignación de rol",
                len(pending_sessions),
            )

            for session in pending_sessions:
                channel_id = int(session["discord_channel_id"])
                expected_code = _invite_code_from_url(session.get("discord_invite_url"))
                if not expected_code:
                    logger.warning(
                        "on_member_join: sesión %s sin invite code en discord_invite_url",
                        session.get("session_id"),
                    )
                    continue

                channel = await _fetch_guild_channel(member.guild, channel_id)
                if channel is None:
                    logger.warning(
                        "on_member_join: canal %s no encontrado (session %s)",
                        channel_id,
                        session.get("session_id"),
                    )
                    continue

                if not hasattr(channel, "invites"):
                    logger.warning(
                        "on_member_join: canal %s no soporta invites()",
                        channel_id,
                    )
                    continue

                channel_invites = await channel.invites()
                active_codes = {invite.code for invite in channel_invites}
                logger.info(
                    "on_member_join: channel.invites() canal %s session %s expected=%s active_codes=%s",
                    channel_id,
                    session.get("session_id"),
                    expected_code,
                    sorted(active_codes),
                )

                if expected_code not in active_codes:
                    logger.info(
                        "on_member_join: invite %s ausente en canal %s (consumido), asignando rol session %s",
                        expected_code,
                        channel_id,
                        session.get("session_id"),
                    )
                    await _assign_role_for_invite(member, expected_code)
                    return

            logger.info(
                "on_member_join: ningún invite consumido detectado en sesiones pendientes para %s",
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
        logger.info(
            "=== /add-client INVOCADO === pid=%s bot_id=%s thread=%s user=%s channel=%s",
            os.getpid(),
            id(bot),
            threading.current_thread().name,
            interaction.user,
            interaction.channel_id,
        )

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

                overwrites = _channel_overwrites(interaction.guild, plan_value)
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
                channel_invites = await discord_channel.invites()
                logger.info(
                    "Invite creado: code=%s url=%s channel_id=%s channel.invites()=%s",
                    invite.code,
                    invite.url,
                    discord_channel.id,
                    [{"code": i.code, "uses": i.uses} for i in channel_invites],
                )

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

            success_embed, welcome_script_overflow = _build_success_embed(
                name=name,
                email=email,
                plan=plan_value,
                password=password,
                expires_at=expires_at,
            )
            await interaction.followup.send(embed=success_embed)
            if welcome_script_overflow:
                await interaction.followup.send(welcome_script_overflow)
            logger.info(
                "=== /add-client COMPLETADO === invite=%s channel_id=%s session=%s",
                invite.code,
                discord_channel.id,
                session_id,
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
    logger.info(
        "=== Discord bot arrancando (pid=%s, bot_id=%s, guild_id=%s) ===",
        os.getpid(),
        id(bot),
        guild_id,
    )
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
    logger.info(
        "Discord bot iniciado en thread daemon (pid=%s, thread=%s).",
        os.getpid(),
        thread.name,
    )
    return thread
