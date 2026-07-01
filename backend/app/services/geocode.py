import httpx

from app.config import settings

ORS_BASE = "https://api.openrouteservice.org"


async def geocode_address(address: str) -> tuple[float, float] | None:
    if not settings.ors_api_key:
        return None
    url = f"{ORS_BASE}/geocode/search"
    params = {"api_key": settings.ors_api_key, "text": address, "size": 1}
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get(url, params=params)
        if not res.is_success:
            return None
        data = res.json()
        features = data.get("features") or []
        if not features:
            return None
        coords = features[0]["geometry"]["coordinates"]
        lng, lat = coords[0], coords[1]
        return lat, lng


async def get_directions(
    coordinates: list[tuple[float, float]],
) -> dict:
    """coordinates as (lng, lat) pairs."""
    if not settings.ors_api_key:
        raise ValueError("ORS_API_KEY is not configured")
    url = f"{ORS_BASE}/v2/directions/driving-car/geojson"
    params = {"api_key": settings.ors_api_key}
    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(
            url,
            params=params,
            json={"coordinates": [[lng, lat] for lng, lat in coordinates]},
        )
        if not res.is_success:
            raise ValueError(f"Directions failed: {res.status_code} {res.text}")
        data = res.json()
        features = data.get("features") or []
        if not features:
            routes = data.get("routes") or []
            if not routes:
                raise ValueError("No route found")
            summary = routes[0]["summary"]
            return {
                "distance_meters": summary["distance"],
                "duration_seconds": summary["duration"],
                "segments": routes[0].get("segments", []),
                "geometry": None,
            }
        props = features[0]["properties"]
        summary = props["summary"]
        geometry = features[0].get("geometry", {}).get("coordinates")
        return {
            "distance_meters": summary["distance"],
            "duration_seconds": summary["duration"],
            "segments": props.get("segments", []),
            "geometry": geometry,
        }


def meters_to_miles(m: float) -> float:
    return m * 0.000621371


def seconds_to_minutes(s: float) -> float:
    return s / 60.0
