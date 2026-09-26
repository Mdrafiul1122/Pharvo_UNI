from pathlib import Path
import csv
import re
import joblib

BACKEND_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = BACKEND_DIR / "ai" / "model"

MODEL_PATH = MODEL_DIR / "PHARVO_svm_FINAL.pkl"
MAPPING_PATH = MODEL_DIR / "PHARVO_36class_mapping_FINAL.csv"

_model = joblib.load(MODEL_PATH)

_problem_mapping = {}

with open(MAPPING_PATH, "r", encoding="utf-8-sig", newline="") as file:
    reader = csv.DictReader(file)

    for row in reader:
        generics = [
            item.strip()
            for item in row["candidate_generics"].split(";")
            if item.strip()
        ]

        _problem_mapping[row["problem_id"]] = {
            "health_problem": row["health_problem"],
            "candidate_generics": generics,
        }


def normalize_query(text: str) -> str:
    original = str(text).strip()
    normalized = original.casefold()

    gastric_patterns = [
        r"গ্যাসের সমস্যা",
        r"গ্যাস সমস্যা",
        r"অ্যাসিডিটি",
        r"এসিডিটি",
        r"\bgas er somossa\b",
        r"\bgas er problem\b",
        r"\bgastric problem\b",
    ]

    for pattern in gastric_patterns:
        if re.search(pattern, normalized):
            return original + " gastric acidity problem"

    return original


def get_prediction_diagnostics(text: str) -> dict:
    features = _model[:-1].transform([text])

    recognized_features = int(features.nnz)

    scores = [
        float(score)
        for score in _model.decision_function([text])[0]
    ]

    ranked = sorted(scores, reverse=True)

    top_score = ranked[0]
    second_score = ranked[1] if len(ranked) > 1 else ranked[0]

    return {
        "recognized_features": recognized_features,
        "top_score": top_score,
        "decision_margin": top_score - second_score,
    }


def is_out_of_scope(diagnostics: dict) -> bool:
    recognized = diagnostics["recognized_features"]
    margin = diagnostics["decision_margin"]

    if recognized == 0:
        return True

    if recognized <= 1 and margin < 0.80:
        return True

    return False


def predict_health_problem(text: str) -> dict:
    if not text or not str(text).strip():
        raise ValueError("Query text cannot be empty.")

    normalized_text = normalize_query(text)

    diagnostics = get_prediction_diagnostics(normalized_text)

    if is_out_of_scope(diagnostics):
        return {
            "input_text": text,
            "normalized_query": normalized_text,
            "classification_status": "out_of_scope",
            "problem_id": "UNKNOWN",
            "health_problem": "Unable to classify safely",
            "candidate_generics": [],
            "confidence": None,
            "decision_margin": round(
                diagnostics["decision_margin"], 4
            ),
            "recognized_features":
                diagnostics["recognized_features"],
            "requires_pharmacist_review": True,
            "message":
                "Unable to classify this complaint. "
                "Please enter a clearer symptom.",
        }

    problem_id = str(
        _model.predict([normalized_text])[0]
    )

    info = _problem_mapping.get(problem_id, {})

    return {
        "input_text": text,
        "normalized_query": normalized_text,
        "classification_status": "classified",
        "problem_id": problem_id,
        "health_problem": info.get("health_problem"),
        "candidate_generics": info.get(
            "candidate_generics", []
        ),
        "confidence": None,
        "decision_margin": round(
            diagnostics["decision_margin"], 4
        ),
        "recognized_features":
            diagnostics["recognized_features"],
        "requires_pharmacist_review": True,
    }
