from .iran_locations import IRAN_LOCATIONS


def iran_locations(request):
    return {"iran_locations": IRAN_LOCATIONS}
