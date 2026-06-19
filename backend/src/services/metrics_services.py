from pony.orm import db_session

from src import schemas
from src.models import OnboardingForm, OnboardingSession

CHOICE_QUESTIONS = [
    "3",
    "29",
    "32",
    "33",
    "35",
    "36",
    "37",
    "40",
    "42",
    "43",
    "45",
    "47",
    "48",
]

CHECKBOX_QUESTIONS = {"29", "36", "40", "43"}


def _extract_values(question_key: str, raw_value) -> list[str]:
    if raw_value is None:
        return []

    text = str(raw_value).strip()
    if not text:
        return []

    if question_key in CHECKBOX_QUESTIONS:
        return [part.strip() for part in text.split(", ") if part.strip()]

    return [text]


class MetricsServices:
    def get_metrics(self) -> schemas.MetricsResponse:
        with db_session:
            total_sessions = OnboardingSession.select().count()
            forms = list(OnboardingForm.select())
            with_form = len(forms)

            metrics: dict[str, dict[str, int]] = {
                question: {} for question in CHOICE_QUESTIONS
            }

            for form in forms:
                form_data = form.form_data
                if not form_data or not isinstance(form_data, dict):
                    continue

                for question_key in CHOICE_QUESTIONS:
                    raw_value = form_data.get(question_key)
                    if raw_value is None:
                        continue

                    counts = metrics[question_key]
                    for value in _extract_values(question_key, raw_value):
                        counts[value] = counts.get(value, 0) + 1

        return schemas.MetricsResponse(
            total_sessions=total_sessions,
            with_form=with_form,
            metrics=metrics,
        )
