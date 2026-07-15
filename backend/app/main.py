import json
import os
from calendar import monthrange
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
from pydantic import BaseModel, Field


EXCLUDED_EXPENSE_CATEGORIES = {"Money In", "Transfer", "Credit Card Payment"}
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
DEFAULT_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6")
OPENAI_TIMEOUT_SECONDS = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "30"))


class Account(BaseModel):
    name: str = ""
    total: float = 0
    debit: bool = True


class Transaction(BaseModel):
    name: str = ""
    category: str = ""
    value: float = 0
    date: int = 0


class Goal(BaseModel):
    name: str = ""
    current: float = 0
    total: float = 0


class Budget(BaseModel):
    category: str = ""
    planned: float = 0
    owner: str = "Finance Ops"
    criticality: str = "Medium"


class WorkspacePayload(BaseModel):
    accounts: List[Account] = Field(default_factory=list)
    transactions: List[Transaction] = Field(default_factory=list)
    goals: List[Goal] = Field(default_factory=list)
    budgets: List[Budget] = Field(default_factory=list)


class AiAnalysisRequest(WorkspacePayload):
    question: str = Field(default="", min_length=1)
    locale: str = "en-US"


app = FastAPI(title="FinSight Analytics API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_openai_client: OpenAI | None = None


def format_money(amount: float) -> str:
    return f"${amount:,.2f}"


def format_percent(value: float, digits: int = 1) -> str:
    return f"{value:.{digits}f}%"


def build_daily_rows(transactions: List[Transaction], current_day: int) -> List[Dict[str, float]]:
    safe_days = max(current_day, 1)
    rows: List[Dict[str, float]] = []
    for day in range(1, safe_days + 1):
        rows.append({"day": day, "income": 0.0, "expense": 0.0})

    for transaction in transactions:
        if transaction.date < 1 or transaction.date > safe_days:
            continue
        if transaction.category == "Money In":
            rows[transaction.date - 1]["income"] += transaction.value
        elif transaction.category not in EXCLUDED_EXPENSE_CATEGORIES:
            rows[transaction.date - 1]["expense"] += transaction.value
    return rows


def get_openai_client() -> OpenAI:
    global _openai_client

    if _openai_client is not None:
        return _openai_client

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured on the backend.")

    _openai_client = OpenAI(api_key=api_key, timeout=OPENAI_TIMEOUT_SECONDS)
    return _openai_client


def build_summary(payload: WorkspacePayload) -> Dict[str, Any]:
    today = datetime.utcnow()
    current_day = today.day
    days_in_month = monthrange(today.year, today.month)[1]

    expense_transactions = [item for item in payload.transactions if item.category not in EXCLUDED_EXPENSE_CATEGORIES]
    income_transactions = [item for item in payload.transactions if item.category == "Money In"]

    net_liquidity = sum(item.total for item in payload.accounts)
    total_expenses = sum(item.value for item in expense_transactions)
    total_income = sum(item.value for item in income_transactions)
    savings_efficiency = 0 if total_income == 0 else ((total_income - total_expenses) / total_income) * 100
    burn_rate = (total_expenses / max(current_day, 1)) * days_in_month
    forecasted_balance = net_liquidity + (((total_income - total_expenses) / max(current_day, 1)) * max(days_in_month - current_day, 0))
    avg_daily_expense = total_expenses / max(current_day, 1)
    runway_days = 0 if avg_daily_expense == 0 else net_liquidity / avg_daily_expense

    budget_lookup = {budget.category: budget for budget in payload.budgets if budget.category}
    spend_by_category: Dict[str, float] = {}
    for transaction in expense_transactions:
        spend_by_category[transaction.category] = spend_by_category.get(transaction.category, 0) + transaction.value

    budget_categories = sorted(set(list(budget_lookup.keys()) + list(spend_by_category.keys())))
    budget_rows: List[Dict[str, Any]] = []
    for category in budget_categories:
        planned = budget_lookup.get(category).planned if budget_lookup.get(category) else 0
        actual = spend_by_category.get(category, 0)
        variance = planned - actual
        utilization = 0 if planned == 0 else (actual / planned) * 100
        status = "On track"
        if planned == 0 and actual > 0:
            status = "Unbudgeted"
            utilization = 100
        elif actual > planned * 1.1:
            status = "Over budget"
        elif actual > planned:
            status = "Watchlist"
        budget_rows.append(
            {
                "id": f"budget-{category.lower().replace(' ', '-')}",
                "category": category,
                "planned": planned,
                "actual": actual,
                "variance": variance,
                "utilization": utilization,
                "status": status,
                "owner": budget_lookup.get(category).owner if budget_lookup.get(category) else "Finance Ops",
                "criticality": budget_lookup.get(category).criticality if budget_lookup.get(category) else "Medium",
            }
        )

    planned_budget = sum(item["planned"] for item in budget_rows)
    remaining_budget = planned_budget - total_expenses
    budget_adherence_rate = 0 if planned_budget == 0 else (total_expenses / planned_budget) * 100
    over_budget_count = len([item for item in budget_rows if item["status"] == "Over budget"])
    unbudgeted_count = len([item for item in budget_rows if item["status"] == "Unbudgeted"])

    total_goal_target = sum(item.total for item in payload.goals)
    total_goal_current = sum(item.current for item in payload.goals)
    funded_goals_ratio = 0 if total_goal_target == 0 else (total_goal_current / total_goal_target) * 100
    goals_at_risk = len([item for item in payload.goals if item.total > 0 and (item.current / item.total) * 100 < 40])

    daily_rows = build_daily_rows(payload.transactions, current_day)
    running_income = 0.0
    running_expense = 0.0
    running_liquidity = net_liquidity - (total_income - total_expenses)
    liquidity_trend: List[Dict[str, float]] = []
    burn_trend: List[Dict[str, float]] = []
    savings_trend: List[Dict[str, float]] = []
    forecast_trend: List[Dict[str, float]] = []
    budget_trend: List[Dict[str, float]] = []
    runway_trend: List[Dict[str, float]] = []

    for row in daily_rows:
        running_income += row["income"]
        running_expense += row["expense"]
        running_liquidity += row["income"] - row["expense"]
        elapsed_days = row["day"]
        projected_burn = (running_expense / elapsed_days) * days_in_month
        running_efficiency = 0 if running_income == 0 else ((running_income - running_expense) / running_income) * 100
        projected_forecast = net_liquidity + (((running_income - running_expense) / elapsed_days) * max(days_in_month - elapsed_days, 0))
        prorated_budget = 0 if planned_budget == 0 else (planned_budget / days_in_month) * elapsed_days
        budget_pulse = 0 if prorated_budget == 0 else (running_expense / prorated_budget) * 100
        runway_pulse = 0 if running_expense == 0 else running_liquidity / max(running_expense / elapsed_days, 1)

        liquidity_trend.append({"day": row["day"], "value": round(running_liquidity, 2)})
        burn_trend.append({"day": row["day"], "value": round(projected_burn, 2)})
        savings_trend.append({"day": row["day"], "value": round(running_efficiency, 2)})
        forecast_trend.append({"day": row["day"], "value": round(projected_forecast, 2)})
        budget_trend.append({"day": row["day"], "value": round(budget_pulse, 2)})
        runway_trend.append({"day": row["day"], "value": round(max(runway_pulse, 0), 2)})

    cards = [
        {
            "label": "Net Liquidity",
            "value": format_money(net_liquidity),
            "badge": f"{len(payload.accounts)} accounts",
            "detail": "Consolidated liquidity across active accounts and liabilities.",
            "tone": "positive" if net_liquidity >= 0 else "negative",
            "sparkline": liquidity_trend or [{"day": 1, "value": 0}],
        },
        {
            "label": "Burn Rate",
            "value": format_money(burn_rate),
            "badge": "Monthly pace",
            "detail": "Projected monthly expense velocity based on current cycle spend.",
            "tone": "neutral" if total_income >= burn_rate else "negative",
            "sparkline": burn_trend or [{"day": 1, "value": 0}],
        },
        {
            "label": "Savings Efficiency",
            "value": format_percent(savings_efficiency),
            "badge": "Income conversion",
            "detail": "Share of income retained after core operational expenses.",
            "tone": "positive" if savings_efficiency >= 20 else "negative",
            "sparkline": savings_trend or [{"day": 1, "value": 0}],
        },
        {
            "label": "Forecasted Balance",
            "value": format_money(forecasted_balance),
            "badge": "Month-end view",
            "detail": "Forward-looking balance estimate at the current daily cashflow pace.",
            "tone": "positive" if forecasted_balance >= 0 else "negative",
            "sparkline": forecast_trend or [{"day": 1, "value": 0}],
        },
        {
            "label": "Budget Adherence",
            "value": "No plan" if planned_budget == 0 else format_percent(budget_adherence_rate),
            "badge": "Budget pending" if planned_budget == 0 else f"{over_budget_count} alerts",
            "detail": "Actual spend versus planned category budgets for this cycle.",
            "tone": "neutral" if planned_budget == 0 else ("positive" if budget_adherence_rate <= 100 else "negative"),
            "sparkline": budget_trend or [{"day": 1, "value": 0}],
        },
        {
            "label": "Liquidity Runway",
            "value": "Stable" if avg_daily_expense == 0 else f"{max(runway_days, 0):.0f} days",
            "badge": "No burn" if avg_daily_expense == 0 else "At current pace",
            "detail": "Estimated number of operating days supported by current liquidity.",
            "tone": "positive" if runway_days >= 45 else ("neutral" if runway_days >= 20 else "negative"),
            "sparkline": runway_trend or [{"day": 1, "value": 0}],
        },
    ]

    return {
        "cards": cards,
        "budgetRows": budget_rows,
        "governance": {
            "plannedBudget": planned_budget,
            "totalExpenses": total_expenses,
            "totalIncome": total_income,
            "remainingBudget": remaining_budget,
            "budgetAdherenceRate": budget_adherence_rate,
            "budgetCoverage": 0 if planned_budget == 0 else max(((planned_budget - total_expenses) / planned_budget) * 100, 0),
            "overBudgetCount": over_budget_count,
            "unbudgetedCount": unbudgeted_count,
            "runwayDays": runway_days,
            "fundedGoalsRatio": funded_goals_ratio,
            "goalsAtRisk": goals_at_risk,
            "avgDailyExpense": avg_daily_expense,
        },
        "insights": [
            "FastAPI computed the current workspace summary.",
            f"{unbudgeted_count} categories are currently unbudgeted." if unbudgeted_count else "All active spend categories have plan coverage.",
        ],
    }


def build_ai_context(payload: WorkspacePayload) -> Dict[str, Any]:
    summary = build_summary(payload)
    expense_transactions = [item for item in payload.transactions if item.category not in EXCLUDED_EXPENSE_CATEGORIES]
    income_transactions = [item for item in payload.transactions if item.category == "Money In"]

    spend_by_category: Dict[str, float] = {}
    for transaction in expense_transactions:
        category = transaction.category or "Unassigned"
        spend_by_category[category] = spend_by_category.get(category, 0) + transaction.value

    top_spend_categories = [
        {"category": category, "amount": round(amount, 2)}
        for category, amount in sorted(spend_by_category.items(), key=lambda item: item[1], reverse=True)[:5]
    ]

    largest_expenses = [
        {
            "name": transaction.name or "Unnamed expense",
            "category": transaction.category or "Unassigned",
            "amount": round(transaction.value, 2),
            "day": transaction.date,
        }
        for transaction in sorted(expense_transactions, key=lambda item: item.value, reverse=True)[:5]
    ]

    largest_income = [
        {
            "name": transaction.name or "Unnamed income",
            "amount": round(transaction.value, 2),
            "day": transaction.date,
        }
        for transaction in sorted(income_transactions, key=lambda item: item.value, reverse=True)[:3]
    ]

    at_risk_goals = [
        {
            "name": goal.name or "Unnamed goal",
            "current": round(goal.current, 2),
            "target": round(goal.total, 2),
            "fundedPercent": round((goal.current / goal.total) * 100, 1),
        }
        for goal in payload.goals
        if goal.total > 0 and (goal.current / goal.total) * 100 < 40
    ]

    budget_alerts = [
        {
            "category": row["category"],
            "status": row["status"],
            "planned": round(row["planned"], 2),
            "actual": round(row["actual"], 2),
            "variance": round(row["variance"], 2),
            "utilization": round(row["utilization"], 1),
            "owner": row["owner"],
            "criticality": row["criticality"],
        }
        for row in summary["budgetRows"]
        if row["status"] != "On track"
    ][:6]

    return {
        "workspace": {
            "accountCount": len(payload.accounts),
            "transactionCount": len(payload.transactions),
            "goalCount": len(payload.goals),
            "budgetCount": len(payload.budgets),
        },
        "summary": summary["governance"],
        "cards": summary["cards"],
        "insights": summary["insights"],
        "topSpendCategories": top_spend_categories,
        "largestExpenses": largest_expenses,
        "largestIncome": largest_income,
        "budgetAlerts": budget_alerts,
        "goalsAtRisk": at_risk_goals,
    }


def build_ai_instructions(locale: str) -> str:
    language = "Turkish" if locale.lower().startswith("tr") else "English"
    return (
        "You are FinSight AI, a financial analytics copilot for managers and finance operators. "
        f"Respond in {language}. "
        "Use only the supplied workspace data. Do not invent facts, transactions, people, or forecasts beyond the provided metrics. "
        "If the data is insufficient, say so clearly. "
        "Keep the answer concise and executive-friendly. "
        "Structure the response with these headings exactly: "
        "Headline, Assessment, Risks, Recommended actions."
    )


def generate_ai_analysis(request: AiAnalysisRequest) -> Dict[str, str]:
    client = get_openai_client()
    context = build_ai_context(
        WorkspacePayload(
            accounts=request.accounts,
            transactions=request.transactions,
            goals=request.goals,
            budgets=request.budgets,
        )
    )

    prompt_payload = {
        "user_question": request.question.strip(),
        "workspace_context": context,
    }

    try:
        response = client.responses.create(
            model=DEFAULT_OPENAI_MODEL,
            instructions=build_ai_instructions(request.locale),
            input=json.dumps(prompt_payload, ensure_ascii=False),
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI request failed: {exc}") from exc

    answer = (response.output_text or "").strip()
    if not answer:
        raise HTTPException(status_code=502, detail="OpenAI returned an empty analysis.")

    return {
        "answer": answer,
        "model": DEFAULT_OPENAI_MODEL,
    }


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "aiConfigured": bool(os.getenv("OPENAI_API_KEY")),
        "model": DEFAULT_OPENAI_MODEL,
    }


@app.post("/api/v1/summary")
def summary(payload: WorkspacePayload) -> Dict[str, Any]:
    return build_summary(payload)


@app.post("/api/v1/ai-analysis")
def ai_analysis(payload: AiAnalysisRequest) -> Dict[str, str]:
    return generate_ai_analysis(payload)
