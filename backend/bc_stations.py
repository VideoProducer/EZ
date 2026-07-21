"""
Environment Canada / ECCC BC weather station registry.

Curated list of primary ECCC climate stations across BC that HAVE published
1981-2010 Canadian Climate Normals available via the official MSC GeoMet
API at api.weather.gc.ca. Every STN_ID below has been verified against
the live API.

Each community is mapped to its nearest primary station based on region
plus per-community keyword overrides for distinctive microclimates.

Live normals are fetched from:
  https://api.weather.gc.ca/collections/climate-normals/items?STN_ID={id}
Six normal elements are extracted per month:
  NORMAL_ID 1  = Mean daily temperature (°C)
  NORMAL_ID 5  = Mean daily max temperature (°C)
  NORMAL_ID 8  = Mean daily min temperature (°C)
  NORMAL_ID 52 = Total rainfall (mm)
  NORMAL_ID 54 = Total snowfall (cm)
  NORMAL_ID 56 = Total precipitation (mm)
"""
from __future__ import annotations
from typing import Optional


# Verified BC ECCC stations with 1981-2010 climate normals published.
# STN_ID confirmed against https://api.weather.gc.ca/collections/climate-normals
BC_STATIONS = {
    "vancouver-intl":   {"name": "Vancouver Intl A",       "station_id": 889,  "climate_id": "1108447", "region_label": "Metro Vancouver"},
    "abbotsford":       {"name": "Abbotsford A",           "station_id": 702,  "climate_id": "1100031", "region_label": "Fraser Valley"},
    "agassiz":          {"name": "Agassiz CDA",            "station_id": 707,  "climate_id": "1100120", "region_label": "Eastern Fraser Valley"},
    "hope-slide":       {"name": "Hope Slide",             "station_id": 951,  "climate_id": "1113581", "region_label": "Hope corridor"},
    "whistler":         {"name": "Whistler",               "station_id": 348,  "climate_id": "1048898", "region_label": "Sea-to-Sky"},
    "powell-river":     {"name": "Powell River A",         "station_id": 327,  "climate_id": "1046390", "region_label": "Sunshine Coast"},
    "gibsons":          {"name": "Gibsons Gower Point",    "station_id": 309,  "climate_id": "1043152", "region_label": "Lower Sunshine Coast"},
    "victoria-intl":    {"name": "Victoria Intl A",        "station_id": 118,  "climate_id": "1018620", "region_label": "Greater Victoria"},
    "nanaimo":          {"name": "Nanaimo A",              "station_id": 192,  "climate_id": "1025370", "region_label": "Central Vancouver Island"},
    "comox":            {"name": "Comox A",                "station_id": 155,  "climate_id": "1021830", "region_label": "Comox Valley"},
    "campbell-river":   {"name": "Campbell River A",       "station_id": 145,  "climate_id": "1021261", "region_label": "North Vancouver Island"},
    "tofino":           {"name": "Tofino A",               "station_id": 277,  "climate_id": "1038205", "region_label": "West Coast Vancouver Island"},
    "port-hardy":       {"name": "Port Hardy A",           "station_id": 202,  "climate_id": "1036B25", "region_label": "North Island"},
    "sandspit":         {"name": "Sandspit A",             "station_id": 367,  "climate_id": "1057050", "region_label": "Haida Gwaii"},
    "prince-rupert":    {"name": "Prince Rupert A",        "station_id": 422,  "climate_id": "1066481", "region_label": "North Coast"},
    "terrace":          {"name": "Terrace A",              "station_id": 441,  "climate_id": "1068131", "region_label": "Northwest BC"},
    "kitimat":          {"name": "Kitimat 2",              "station_id": 403,  "climate_id": "1064321", "region_label": "Kitimat"},
    "bella-coola":      {"name": "Bella Coola A",          "station_id": 381,  "climate_id": "1060841", "region_label": "Central Coast"},
    "smithers":         {"name": "Smithers A",             "station_id": 487,  "climate_id": "1077500", "region_label": "Bulkley Valley"},
    "prince-george":    {"name": "Prince George A",        "station_id": 631,  "climate_id": "1096450", "region_label": "Central Interior"},
    "quesnel":          {"name": "Quesnel A",              "station_id": 640,  "climate_id": "1096630", "region_label": "North Cariboo"},
    "williams-lake":    {"name": "Williams Lake A",        "station_id": 664,  "climate_id": "1098941", "region_label": "Cariboo Chilcotin"},
    "fort-st-james":    {"name": "Fort St James",          "station_id": 588,  "climate_id": "1092970", "region_label": "Nechako"},
    "fort-nelson":      {"name": "Fort Nelson A",          "station_id": 1455, "climate_id": "1192940", "region_label": "Northeast BC"},
    "fort-st-john":     {"name": "Fort St John A",         "station_id": 1413, "climate_id": "1183000", "region_label": "Peace River"},
    "dawson-creek":     {"name": "Dawson Creek A",         "station_id": 1404, "climate_id": "1182285", "region_label": "South Peace"},
    "atlin":            {"name": "Atlin",                  "station_id": 1485, "climate_id": "1200560", "region_label": "Far North BC"},
    "dease-lake":       {"name": "Dease Lake",             "station_id": 1454, "climate_id": "1192340", "region_label": "Northern BC"},
    "stewart":          {"name": "Stewart A",              "station_id": 434,  "climate_id": "1067741", "region_label": "Northwest Coast"},
    "kamloops":         {"name": "Kamloops A",             "station_id": 1275, "climate_id": "1163780", "region_label": "Thompson"},
    "merritt":          {"name": "Merritt STP",            "station_id": 1022, "climate_id": "1125079", "region_label": "Nicola Valley"},
    "salmon-arm":       {"name": "Salmon Arm A",           "station_id": 1311, "climate_id": "1166R51", "region_label": "Shuswap"},
    "kelowna":          {"name": "Kelowna A",              "station_id": 1001, "climate_id": "1123970", "region_label": "Central Okanagan"},
    "penticton":        {"name": "Penticton A",            "station_id": 1053, "climate_id": "1126150", "region_label": "South Okanagan"},
    "vernon":           {"name": "Vernon Bella Vista",     "station_id": 1066, "climate_id": "1128582", "region_label": "North Okanagan"},
    "oliver":           {"name": "Oliver STP",             "station_id": 1039, "climate_id": "1125766", "region_label": "South Okanagan"},
    "osoyoos":          {"name": "Osoyoos West",           "station_id": 1043, "climate_id": "1125852", "region_label": "South Okanagan"},
    "castlegar":        {"name": "Castlegar A",            "station_id": 1105, "climate_id": "1141455", "region_label": "West Kootenay"},
    "cranbrook":        {"name": "Cranbrook A",            "station_id": 1174, "climate_id": "1152102", "region_label": "East Kootenay"},
    "fernie":           {"name": "Fernie",                 "station_id": 1180, "climate_id": "1152850", "region_label": "Elk Valley"},
    "sparwood":         {"name": "Sparwood",               "station_id": 1207, "climate_id": "1157630", "region_label": "Elk Valley"},
    "golden":           {"name": "Golden A",               "station_id": 1364, "climate_id": "1173210", "region_label": "Columbia Valley"},
}


# Region → default station map
REGION_TO_STATION = {
    "Greater Vancouver":               "vancouver-intl",
    "Fraser Valley":                   "abbotsford",
    "Sea-to-Sky":                      "whistler",
    "Sunshine Coast":                  "powell-river",
    "Vancouver Island & Gulf Islands": "victoria-intl",
    "Haida Gwaii":                     "sandspit",
    "Central Coast":                   "bella-coola",
    "Northern BC":                     "prince-george",
    "Cariboo":                         "williams-lake",
    "Southern Interior":               "kamloops",
    "Okanagan":                        "kelowna",
    "Kootenay":                        "castlegar",
}


# Community-name substring → station. Case-insensitive. First match wins.
COMMUNITY_STATION_OVERRIDES = [
    # Sea-to-Sky
    ("whistler",       "whistler"),
    ("pemberton",      "whistler"),
    ("squamish",       "vancouver-intl"),  # no Squamish normals station; VIA closest
    ("britannia beach","vancouver-intl"),
    ("furry creek",    "vancouver-intl"),

    # Sunshine Coast
    ("powell river",   "powell-river"),
    ("gibsons",        "gibsons"),
    ("sechelt",        "gibsons"),
    ("roberts creek",  "gibsons"),
    ("halfmoon bay",   "gibsons"),
    ("langdale",       "gibsons"),
    ("madeira park",   "powell-river"),
    ("egmont",         "powell-river"),
    ("pender harbour", "powell-river"),
    ("earls cove",     "powell-river"),

    # Fraser Valley
    ("abbotsford",     "abbotsford"),
    ("chilliwack",     "agassiz"),
    ("mission",        "abbotsford"),
    ("agassiz",        "agassiz"),
    ("harrison",       "agassiz"),
    ("hope",           "hope-slide"),
    ("boston bar",     "hope-slide"),
    ("bridal falls",   "agassiz"),
    ("yarrow",         "agassiz"),

    # Vancouver Island
    ("tofino",         "tofino"),
    ("ucluelet",       "tofino"),
    ("port alberni",   "tofino"),
    ("bamfield",       "tofino"),
    ("port hardy",     "port-hardy"),
    ("port mcneill",   "port-hardy"),
    ("port alice",     "port-hardy"),
    ("alert bay",      "port-hardy"),
    ("holberg",        "port-hardy"),
    ("winter harbour", "port-hardy"),
    ("sointula",       "port-hardy"),
    ("campbell river", "campbell-river"),
    ("quadra",         "campbell-river"),
    ("cortes",         "campbell-river"),
    ("gold river",     "campbell-river"),
    ("tahsis",         "campbell-river"),
    ("zeballos",       "campbell-river"),
    ("sayward",        "campbell-river"),
    ("courtenay",      "comox"),
    ("comox",          "comox"),
    ("cumberland",     "comox"),
    ("black creek",    "comox"),
    ("union bay",      "comox"),
    ("fanny bay",      "comox"),
    ("denman",         "comox"),
    ("hornby",         "comox"),
    ("nanaimo",        "nanaimo"),
    ("lantzville",     "nanaimo"),
    ("parksville",     "nanaimo"),
    ("qualicum",       "nanaimo"),
    ("errington",      "nanaimo"),
    ("coombs",         "nanaimo"),
    ("ladysmith",      "nanaimo"),
    ("chemainus",      "nanaimo"),
    ("crofton",        "nanaimo"),
    ("duncan",         "nanaimo"),
    ("cowichan",       "nanaimo"),
    ("mill bay",       "nanaimo"),
    ("shawnigan",      "nanaimo"),
    ("cobble hill",    "nanaimo"),

    # Greater Victoria & Gulf Islands
    ("victoria",       "victoria-intl"),
    ("saanich",        "victoria-intl"),
    ("sooke",          "victoria-intl"),
    ("sidney",         "victoria-intl"),
    ("langford",       "victoria-intl"),
    ("colwood",        "victoria-intl"),
    ("oak bay",        "victoria-intl"),
    ("esquimalt",      "victoria-intl"),
    ("view royal",     "victoria-intl"),
    ("metchosin",      "victoria-intl"),
    ("highlands",      "victoria-intl"),
    ("salt spring",    "victoria-intl"),
    ("mayne",          "victoria-intl"),
    ("galiano",        "victoria-intl"),
    ("pender",         "victoria-intl"),
    ("saturna",        "victoria-intl"),
    ("port renfrew",   "victoria-intl"),

    # North Coast / Haida Gwaii / Central Coast
    ("prince rupert",  "prince-rupert"),
    ("terrace",        "terrace"),
    ("kitimat",        "kitimat"),
    ("stewart",        "stewart"),
    ("masset",         "sandspit"),
    ("port clements",  "sandspit"),
    ("daajing giids",  "sandspit"),
    ("bella coola",    "bella-coola"),
    ("bella bella",    "bella-coola"),
    ("atnarko",        "bella-coola"),
    ("hagensborg",     "bella-coola"),
    ("smithers",       "smithers"),
    ("houston",        "smithers"),
    ("burns lake",     "smithers"),
    ("telkwa",         "smithers"),
    ("hazelton",       "smithers"),
    ("kitwanga",       "smithers"),

    # Northern BC / Peace / Nechako
    ("prince george",  "prince-george"),
    ("mackenzie",      "prince-george"),
    ("valemount",      "prince-george"),
    ("mcbride",        "prince-george"),
    ("vanderhoof",     "fort-st-james"),
    ("fort st james",  "fort-st-james"),
    ("fraser lake",    "fort-st-james"),
    ("fort nelson",    "fort-nelson"),
    ("fort st john",   "fort-st-john"),
    ("taylor",         "fort-st-john"),
    ("hudson",         "fort-st-john"),
    ("dawson creek",   "dawson-creek"),
    ("chetwynd",       "dawson-creek"),
    ("tumbler ridge",  "dawson-creek"),
    ("atlin",          "atlin"),
    ("dease lake",     "dease-lake"),

    # Cariboo
    ("100 mile",       "williams-lake"),
    ("108 mile",       "williams-lake"),
    ("williams lake",  "williams-lake"),
    ("quesnel",        "quesnel"),
    ("horsefly",       "williams-lake"),
    ("likely",         "williams-lake"),
    ("cinema",         "quesnel"),

    # Southern Interior / Thompson-Nicola
    ("kamloops",       "kamloops"),
    ("logan lake",     "kamloops"),
    ("ashcroft",       "kamloops"),
    ("cache creek",    "kamloops"),
    ("clinton",        "kamloops"),
    ("barriere",       "kamloops"),
    ("clearwater",     "kamloops"),
    ("blue river",     "kamloops"),
    ("merritt",        "merritt"),
    ("lower nicola",   "merritt"),
    ("princeton",      "merritt"),
    ("hedley",         "merritt"),
    ("lillooet",       "kamloops"),
    ("lytton",         "hope-slide"),
    ("chase",          "salmon-arm"),
    ("salmon arm",     "salmon-arm"),
    ("sicamous",       "salmon-arm"),
    ("blind bay",      "salmon-arm"),
    ("sorrento",       "salmon-arm"),
    ("celista",        "salmon-arm"),
    ("scotch creek",   "salmon-arm"),

    # Okanagan
    ("kelowna",        "kelowna"),
    ("west kelowna",   "kelowna"),
    ("lake country",   "kelowna"),
    ("peachland",      "kelowna"),
    ("westbank",       "kelowna"),
    ("penticton",      "penticton"),
    ("summerland",     "penticton"),
    ("naramata",       "penticton"),
    ("kaleden",        "penticton"),
    ("okanagan falls", "penticton"),
    ("oliver",         "oliver"),
    ("osoyoos",        "osoyoos"),
    ("cawston",        "oliver"),
    ("keremeos",       "oliver"),
    ("vernon",         "vernon"),
    ("armstrong",      "vernon"),
    ("enderby",        "vernon"),
    ("coldstream",     "vernon"),
    ("lumby",          "vernon"),
    ("cherryville",    "vernon"),

    # Kootenay
    ("nelson",         "castlegar"),
    ("trail",          "castlegar"),
    ("rossland",       "castlegar"),
    ("castlegar",      "castlegar"),
    ("salmo",          "castlegar"),
    ("fruitvale",      "castlegar"),
    ("montrose",       "castlegar"),
    ("warfield",       "castlegar"),
    ("grand forks",    "castlegar"),
    ("greenwood",      "castlegar"),
    ("midway",         "castlegar"),
    ("christina lake", "castlegar"),
    ("kaslo",          "castlegar"),
    ("new denver",     "castlegar"),
    ("silverton",      "castlegar"),
    ("nakusp",         "castlegar"),
    ("balfour",        "castlegar"),
    ("ainsworth",      "castlegar"),
    ("crawford bay",   "castlegar"),
    ("riondel",        "castlegar"),
    ("ymir",           "castlegar"),
    ("procter",        "castlegar"),
    ("cranbrook",      "cranbrook"),
    ("kimberley",      "cranbrook"),
    ("invermere",      "cranbrook"),
    ("radium",         "cranbrook"),
    ("canal flats",    "cranbrook"),
    ("fairmont",       "cranbrook"),
    ("wasa",           "cranbrook"),
    ("fort steele",    "cranbrook"),
    ("moyie",          "cranbrook"),
    ("elko",           "cranbrook"),
    ("jaffray",        "cranbrook"),
    ("fernie",         "fernie"),
    ("sparwood",       "sparwood"),
    ("elkford",        "sparwood"),
    ("golden",         "golden"),
    ("field",          "golden"),
    ("brisco",         "golden"),
    ("edgewater",      "golden"),
    ("parson",         "golden"),
    ("revelstoke",     "golden"),
]


def get_station_for_community(name: str, region: str) -> Optional[dict]:
    """Return primary ECCC station for a community (with slug added)."""
    if not name:
        return None
    name_lc = name.lower()
    for keyword, station_slug in COMMUNITY_STATION_OVERRIDES:
        if keyword in name_lc:
            st = BC_STATIONS.get(station_slug)
            if st:
                return {**st, "slug": station_slug}
    station_slug = REGION_TO_STATION.get(region)
    if station_slug:
        st = BC_STATIONS.get(station_slug)
        if st:
            return {**st, "slug": station_slug}
    st = BC_STATIONS["vancouver-intl"]
    return {**st, "slug": "vancouver-intl"}


def eccc_normals_search_url(name: str) -> str:
    """ECCC Climate Normals search URL — deep-linked with community name."""
    from urllib.parse import quote_plus
    return (f"https://climate.weather.gc.ca/climate_normals/results_1981_2010_e.html"
            f"?searchType=stnName&txtStationName={quote_plus(name)}"
            f"&searchMethod=contains&province=BC&provBut=Search")


def eccc_station_page_url(station_id: int) -> str:
    """Direct ECCC results page for a specific station."""
    return (f"https://climate.weather.gc.ca/climate_normals/"
            f"results_1981_2010_e.html?stnID={station_id}&autofwd=1")
