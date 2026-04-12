from calendar import monthrange
from datetime import datetime
from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


EXCLUDED_EXPENSE_CATEGORIES = {"Money In", "Transfer", "Credit Card Payment"}


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


app = FastAPI(title="FinSight Analytics API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/summary")
def summary(payload: WorkspacePayload) -> Dict[str, Any]:
    return build_summary(payload)
