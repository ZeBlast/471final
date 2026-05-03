import ast
import csv
import difflib
import re
from pathlib import Path


BASE = Path(__file__).resolve().parent
SCHOOLS_PATH = BASE / "schools.csv"
AID_PATH = BASE / "aid.csv"
PSEO_INST_PATH = BASE / "pseo_all_institutions.csv"
PSEO_OUTCOMES_PATH = BASE / "pseoe_all.csv"
OUTPUT_PATH = BASE / "combined_pseo_all_cohorts.csv"

MANUAL_NAME_MAP = {
    ("AL", "University of Alabama"): "The University of Alabama",
    ("AL", "University of Alabama at Birmingham"): "University of Alabama at Birmingham",
    ("AL", "University of Alabama in Huntsville"): "University of Alabama in Huntsville",
    ("AZ", "Arizona State University"): "Arizona State University Campus Immersion",
    ("GA", "Georgia Institute of Technology"): "Georgia Institute of Technology-Main Campus",
    ("IN", "Purdue University"): "Purdue University-Main Campus",
    ("MO", "Missouri State University"): "Missouri State University-Springfield",
}


def norm(value):
    value = value.lower().replace("&", "and")
    value = re.sub(r"\(the\)", "", value)
    value = re.sub(r"\bmain campus\b", "", value)
    value = re.sub(r"\bcampus immersion\b", "", value)
    value = re.sub(r"\bdigital immersion\b", "", value)
    value = re.sub(r"\bthe\b", "", value)
    value = re.sub(r"\([^)]*\)", "", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def to_float(value):
    if value in ("", None):
        return None
    try:
        return float(value)
    except Exception:
        return None


def to_int(value):
    if value in ("", None):
        return None
    try:
        return int(float(value))
    except Exception:
        return None


def parse_obj(text):
    if not text:
        return {}
    try:
        value = ast.literal_eval(text)
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def read_csv(path, encoding="utf-8"):
    with path.open(newline="", encoding=encoding) as handle:
        return list(csv.DictReader(handle))


def build_school_lookup():
    schools = read_csv(SCHOOLS_PATH)
    aid_rows = read_csv(AID_PATH)
    aid_by_idx = {row[""]: row for row in aid_rows}

    school_enriched = []
    for school in schools:
        aid = aid_by_idx.get(school[""])
        if not aid:
            continue

        debt_info = parse_obj(aid.get("median_debt_suppressed"))
        completer = debt_info.get("completers", {}) if isinstance(debt_info.get("completers", {}), dict) else {}

        school_enriched.append({
            "index": school[""],
            "id": school.get("id"),
            "name": school.get("name"),
            "city": school.get("city"),
            "state": school.get("state"),
            "lat": to_float(school.get("lat")),
            "lon": to_float(school.get("lon")),
            "tuitionInState": to_int(school.get("tuition_in_state")),
            "tuitionOutState": to_int(school.get("tuition_out_of_state")),
            "roomCost": to_int(school.get("room_oncampus")) or to_int(school.get("room_offcampus")),
            "bookCost": to_int(school.get("booksupply")),
            "loanPrincipal": to_int(aid.get("loan_principal")),
            "pellGrantRate": to_float(aid.get("pell_grant_rate")),
            "federalLoanRate": to_float(aid.get("federal_loan_rate")),
            "studentsWithAnyLoan": to_float(aid.get("students_with_any_loan")),
            "medianDebtOverall": to_int(debt_info.get("overall")),
            "completerDebt": to_int(completer.get("overall")),
            "monthlyPayment": round(float(completer.get("monthly_payments")), 2) if completer.get("monthly_payments") not in ("", None) else None,
        })

    by_state = {}
    for school in school_enriched:
        by_state.setdefault(school["state"], []).append(school)
    return by_state


def find_school_match(institution, by_state):
    school_match = None
    match_method = None
    candidates = by_state.get(institution["institution_state"], [])

    manual_target = MANUAL_NAME_MAP.get((institution["institution_state"], institution["label"]))
    if manual_target:
        for candidate in candidates:
            if candidate["name"] == manual_target:
                return candidate, "manual"

    label_norm = norm(institution["label"])
    exact = [candidate for candidate in candidates if norm(candidate["name"]) == label_norm]
    if len(exact) == 1:
        return exact[0], "exact"

    scored = []
    for candidate in candidates:
        candidate_norm = norm(candidate["name"])
        score = difflib.SequenceMatcher(None, label_norm, candidate_norm).ratio()
        if label_norm in candidate_norm or candidate_norm in label_norm:
            score += 0.08
        scored.append((score, candidate))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    if scored and scored[0][0] >= 0.92 and (len(scored) == 1 or scored[0][0] - scored[1][0] >= 0.03):
        school_match = scored[0][1]
        match_method = "fuzzy"

    return school_match, match_method


def build():
    by_state = build_school_lookup()
    pseo_institutions = read_csv(PSEO_INST_PATH, encoding="utf-8-sig")
    pseo_rows = read_csv(PSEO_OUTCOMES_PATH)

    institution_map = {row["institution"]: row for row in pseo_institutions}
    matched_schools = {}
    for institution in pseo_institutions:
        school_match, match_method = find_school_match(institution, by_state)
        if school_match and school_match["lat"] is not None and school_match["lon"] is not None:
            matched_schools[institution["institution"]] = (institution, school_match, match_method)

    valid_cohorts = {"0000", "2001", "2004", "2007", "2010", "2013", "2016", "2019"}
    output_rows = []

    for outcome in pseo_rows:
        if outcome["inst_level"] != "I" or outcome["cip_level"] != "A" or outcome["degree_level"] != "05":
            continue
        if outcome["grad_cohort"] not in valid_cohorts:
            continue

        match_bundle = matched_schools.get(outcome["institution"])
        if not match_bundle:
            continue

        institution, school_match, match_method = match_bundle
        y1_p50 = to_int(outcome["y1_p50_earnings"])
        y5_p50 = to_int(outcome["y5_p50_earnings"])
        y10_p50 = to_int(outcome["y10_p50_earnings"])
        if y1_p50 is None and y5_p50 is None and y10_p50 is None:
            continue

        tuition_in = school_match["tuitionInState"]
        room_cost = school_match["roomCost"]
        book_cost = school_match["bookCost"]
        total_cost = sum(value for value in [tuition_in, room_cost, book_cost] if value is not None)
        completer_debt = school_match["completerDebt"] or school_match["medianDebtOverall"] or school_match["loanPrincipal"]
        earnings_debt_ratio = round(y1_p50 / completer_debt, 2) if y1_p50 and completer_debt else None

        output_rows.append({
            "pseoInstitutionId": outcome["institution"],
            "name": institution["label"],
            "state": institution["institution_state"],
            "city": school_match["city"],
            "lat": school_match["lat"],
            "lon": school_match["lon"],
            "tuitionInState": tuition_in,
            "tuitionOutState": school_match["tuitionOutState"],
            "roomCost": room_cost,
            "bookCost": book_cost,
            "totalCostEstimate": total_cost if total_cost else None,
            "loanPrincipal": school_match["loanPrincipal"],
            "pellGrantRate": school_match["pellGrantRate"],
            "federalLoanRate": school_match["federalLoanRate"],
            "studentsWithAnyLoan": school_match["studentsWithAnyLoan"],
            "medianDebtOverall": school_match["medianDebtOverall"],
            "completerDebt": completer_debt,
            "monthlyPayment": school_match["monthlyPayment"],
            "gradCohort": outcome["grad_cohort"],
            "gradCohortYears": to_int(outcome["grad_cohort_years"]),
            "y1P25Earnings": to_int(outcome["y1_p25_earnings"]),
            "y1P50Earnings": y1_p50,
            "y1P75Earnings": to_int(outcome["y1_p75_earnings"]),
            "y1GradsEarn": to_int(outcome["y1_grads_earn"]),
            "y1IpedsCount": to_int(outcome["y1_ipeds_count"]),
            "y5P25Earnings": to_int(outcome["y5_p25_earnings"]),
            "y5P50Earnings": y5_p50,
            "y5P75Earnings": to_int(outcome["y5_p75_earnings"]),
            "y5GradsEarn": to_int(outcome["y5_grads_earn"]),
            "y5IpedsCount": to_int(outcome["y5_ipeds_count"]),
            "y10P25Earnings": to_int(outcome["y10_p25_earnings"]),
            "y10P50Earnings": y10_p50,
            "y10P75Earnings": to_int(outcome["y10_p75_earnings"]),
            "y10GradsEarn": to_int(outcome["y10_grads_earn"]),
            "y10IpedsCount": to_int(outcome["y10_ipeds_count"]),
            "earningsDebtRatio": earnings_debt_ratio,
            "matchMethod": match_method,
        })

    output_rows.sort(key=lambda row: (row["gradCohort"], row["name"]))
    fieldnames = list(output_rows[0].keys()) if output_rows else []
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    print(f"Wrote {len(output_rows)} rows to {OUTPUT_PATH.name}")


if __name__ == "__main__":
    build()
