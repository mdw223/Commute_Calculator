from app.services.geocode import get_directions, meters_to_miles, seconds_to_minutes


def calculate_trip_cost(
    distance_miles: float,
    duration_minutes: float,
    cost_settings: dict,
    round_trip: bool = True,
) -> dict:
    multiplier = 2 if round_trip else 1
    miles = distance_miles * multiplier
    minutes = duration_minutes * multiplier

    gas_price = cost_settings.get("gasPricePerGallon", 3.5)
    mpg = cost_settings.get("mpg", 25.0)
    include_maintenance = cost_settings.get("includeMaintenance", False)
    maintenance_per_mile = cost_settings.get("maintenancePerMile", 0.1)
    include_time_value = cost_settings.get("includeTimeValue", False)
    hourly_rate = cost_settings.get("hourlyRate", 20.0)

    gas_cost = (miles / mpg) * gas_price if mpg > 0 else 0
    maintenance_cost = miles * maintenance_per_mile if include_maintenance else 0
    time_cost = (minutes / 60) * hourly_rate if include_time_value else 0
    trip_cost = gas_cost + maintenance_cost + time_cost

    return {
        "distance_miles": miles,
        "duration_minutes": minutes,
        "gas_cost": round(gas_cost, 2),
        "maintenance_cost": round(maintenance_cost, 2),
        "trip_cost": round(trip_cost, 2),
    }


def analyze_job_worth_it(
    trip_cost: float,
    job_pay: float,
    duration_minutes: float,
    cost_settings: dict,
    job_duration_minutes: float | None = None,
    hard_cost: float | None = None,
) -> dict:
    """Worth-it analysis for a Sweeps job: compare pay vs drive cost."""
    drive_hours = duration_minutes / 60 if duration_minutes > 0 else 0
    net_profit = job_pay - trip_cost

    side_hustle_rate = cost_settings.get("sideHustleRate", 20.0)
    include_side_hustle = cost_settings.get("includeSideHustle", True)

    mood = "meh"
    headline = "BORDERLINE"
    subline = "Pay barely covers the drive. Your call."

    if net_profit < 0:
        mood = "bad"
        headline = "NOT WORTH IT"
        subline = f"You'd lose ${abs(net_profit):.2f} after gas. Hard pass."
    elif net_profit >= job_pay * 0.5:
        mood = "good"
        headline = "WORTH IT"
        subline = f"Net ~${net_profit:.2f} after drive costs. Send it."
    elif net_profit > 0:
        mood = "meh"
        headline = "BORDERLINE"
        subline = f"Only ~${net_profit:.2f} profit after gas. Meh."

    if include_side_hustle and side_hustle_rate > 0 and drive_hours > 0:
        opportunity_cost = drive_hours * side_hustle_rate
        if job_pay < opportunity_cost + trip_cost:
            mood = "bad"
            headline = "NOT WORTH IT"
            subline = (
                f"${job_pay:.0f} pay < ${opportunity_cost:.0f} drive time "
                f"+ ${trip_cost:.2f} gas. Skip."
            )

    effective_hourly_rate = None
    total_hours = None
    current_job_earnings = None
    if (
        cost_settings.get("includeHourlySalary")
        and job_duration_minutes
        and job_duration_minutes > 0
    ):
        total_hours = (job_duration_minutes / 60) + drive_hours
        cost_for_rate = hard_cost if hard_cost is not None else trip_cost
        if total_hours > 0:
            effective_hourly_rate = (job_pay - cost_for_rate) / total_hours
            current_wage = cost_settings.get("hourlySalary", 25.0)
            current_job_earnings = current_wage * total_hours
            if current_wage > 0 and effective_hourly_rate < current_wage:
                mood = "bad"
                headline = "NOT WORTH IT"
                subline = (
                    f"Effective ${effective_hourly_rate:.2f}/hr over {total_hours:.1f}h "
                    f"(job + drive) vs your ${current_wage:.2f}/hr job. Skip."
                )

    return {
        "worth_it_mood": mood,
        "worth_it_headline": headline,
        "worth_it_subline": subline,
        "net_profit": round(net_profit, 2),
        "effective_hourly_rate": (
            round(effective_hourly_rate, 2) if effective_hourly_rate is not None else None
        ),
        "total_time_hours": round(total_hours, 2) if total_hours is not None else None,
        "current_job_earnings": (
            round(current_job_earnings, 2) if current_job_earnings is not None else None
        ),
    }


async def compute_commute(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    cost_settings: dict,
    job_pay: float,
    round_trip: bool = True,
    job_duration_minutes: float | None = None,
) -> dict:
    route = await get_directions([(origin_lng, origin_lat), (dest_lng, dest_lat)])
    distance_miles = meters_to_miles(route["distance_meters"])
    duration_minutes = seconds_to_minutes(route["duration_seconds"])

    costs = calculate_trip_cost(distance_miles, duration_minutes, cost_settings, round_trip)
    hard_cost = costs["gas_cost"] + costs.get("maintenance_cost", 0)
    worth = analyze_job_worth_it(
        costs["trip_cost"],
        job_pay,
        costs["duration_minutes"],
        cost_settings,
        job_duration_minutes=job_duration_minutes,
        hard_cost=hard_cost,
    )

    return {
        **costs,
        **worth,
        "geometry": route.get("geometry"),
    }
