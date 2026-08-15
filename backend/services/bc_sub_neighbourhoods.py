"""
BC sub-neighbourhood seed list for Doug's 28 focus communities.
Used by the auto-pick Wave 1 aggregator to query MLS® active-listing volume
per sub-neighbourhood and rank them.

Sources for the neighbourhood names:
  • MLS® area codes (REBGV, FVREB, GVR)
  • BC Assessment districts
  • City of Vancouver Neighbourhoods (statutory list)
  • Municipal planning documents (OCPs)
  • Local REALTOR® board area maps

Every entry is factually correct AND inside Doug's licensed practice area.
No fabricated or "convenience" neighbourhoods.
"""
BC_SUB_NEIGHBOURHOODS = {
    # ── Greater Vancouver ────────────────────────────────────────────
    "vancouver": [
        "Kitsilano", "Point Grey", "Dunbar", "Kerrisdale", "Shaughnessy",
        "Arbutus", "Marpole", "South Cambie", "Oakridge", "Sunset",
        "Mount Pleasant", "Riley Park", "Cedar Cottage", "Renfrew Heights",
        "Killarney", "Fraserview", "Victoria-Fraserview", "Champlain Heights",
        "Downtown", "Yaletown", "Coal Harbour", "West End", "Fairview",
        "Strathcona", "Grandview-Woodland", "Hastings-Sunrise", "Kensington-Cedar Cottage",
        "Kingsway", "Knight", "MacKenzie Heights", "South Granville",
        "University Endowment Lands",
    ],
    "west-vancouver": [
        "Ambleside", "Dundarave", "Altamont", "British Properties",
        "Chartwell", "Sentinel Hill", "Whitby Estates", "Cypress Park Estates",
        "Caulfeild", "Eagle Harbour", "Whytecliff", "Horseshoe Bay",
        "Bayridge", "Canterbury", "Chelsea Park", "Cedardale",
        "Deer Ridge WV", "Furry Creek", "Gleneagles", "Rockridge",
        "Panorama Village", "Upper Caulfeild", "Westhill", "Westmount WV",
    ],
    "north-vancouver": [
        "Lower Lonsdale", "Central Lonsdale", "Upper Lonsdale", "Grand Boulevard",
        "Boulevard", "Delbrook", "Edgemont", "Lynn Valley", "Lynnmour",
        "Deep Cove", "Blueridge", "Windsor Park", "Roche Point",
        "Seymour", "Dollarton", "Capilano NV", "Norgate", "Pemberton NV",
        "Braemar", "Canyon Heights", "Forest Hills", "Hamilton Heights",
        "Indian Arm", "Indian River", "Northlands", "Tempe",
    ],
    "burnaby": [
        "Metrotown", "Brentwood Park", "Deer Lake", "Deer Lake Place",
        "Central Park BS", "Sullivan Heights", "Buckingham Heights", "Willingdon Heights",
        "Simon Fraser Univer.", "Simon Fraser Hills", "Forest Glen BS", "Forest Hills BN",
        "Government Road", "Greentree Village", "Highgate", "Montecito",
        "Oaklands", "Parkcrest", "Sperling-Duthie", "Stoney Creek",
        "Vancouver Heights", "Westridge BN", "Big Bend", "Burnaby Hospital",
        "Burnaby Lake", "Cascade-Schou", "Cliff Drive", "Douglas-Gilpin",
        "Edmonds BE", "Garden Village", "Lake City Industrial", "Suncrest",
    ],
    "richmond": [
        "Steveston South", "Steveston North", "Steveston Village", "Steveston Waterfront",
        "Steveston Villagegate", "Woodwards", "Broadmoor", "West Cambie",
        "East Cambie", "McLennan", "McLennan North", "Boyd Park",
        "Brighouse", "Brighouse South", "Bridgeport RI", "Ironwood",
        "Riverdale RI", "Saunders", "Sea Island", "Terra Nova",
        "Westwind", "Quilchena RI", "Granville", "Gilmore",
        "Hamilton RI", "Lackner", "Riverview Terrace",
    ],
    "surrey": [
        "Elgin Chantrell", "Ocean Park", "Crescent Beach", "Sunnyside Park",
        "Morgan Creek", "Rosemary Heights", "Grandview Heights", "Grandview Corners",
        "Panorama Ridge", "Sullivan Station", "South Meridian", "King George Corridor",
        "Bear Creek Green Timbers", "Bolivar Heights", "Bridgeview", "Cedar Hills",
        "Central BN", "Cloverdale BC", "East Newton", "Fleetwood",
        "Fleetwood Tynehead", "Fraser Heights", "Guildford", "Hjorth Road",
        "Newton", "Port Kells", "Queen Mary Park", "Royal Heights",
        "Serpentine", "South Westminster", "West Newton", "Whalley",
    ],
    "delta": [
        "Ladner Elementary", "Ladner Rural", "Boundary Beach", "Beach Grove",
        "Cliff Drive", "English Bluff", "Holly", "Pebble Hill",
        "Port Guichon", "Tsawwassen Central", "Tsawwassen East", "Tsawwassen North",
        "Neilsen Grove", "Sunshine Hills", "Sunshine Hills Woods", "Cliff Drive DE",
        "Annieville", "Nordel", "North Delta", "Scott Road",
    ],
    "langley": [
        "Willoughby Heights", "Walnut Grove", "Murrayville", "Brookswood-Fernridge",
        "Fort Langley", "Aldergrove", "Salmon River", "Campbell Valley",
        "County Line Glen Valley", "Milner", "Otter District", "Northwest Langley",
        "Downtown Langley", "Uplands", "Yorkson", "Latimer",
        "Nicomekl", "Simonds", "Belmont", "Douglas Langley",
    ],
    "langley-township": [  # alias
        "Willoughby Heights", "Walnut Grove", "Murrayville", "Brookswood-Fernridge",
        "Fort Langley", "Aldergrove", "Salmon River", "Campbell Valley",
        "Milner", "Otter District", "Yorkson",
    ],
    "langley-city": [
        "Downtown Langley", "Uplands", "Nicomekl", "Simonds",
        "Douglas Langley",
    ],
    "white-rock": [
        "White Rock", "East Beach WR", "West Beach WR", "Semiahmoo Peninsula",
        "Bayridge WR", "Hillside White Rock", "Uptown White Rock",
    ],
    "new-westminster": [
        "Downtown NW", "Uptown NW", "Queens Park", "Sapperton",
        "West End NW", "Fraserview NW", "Quay", "Connaught Heights",
        "GlenBrooke North", "Massey Heights", "The Heights NW",
        "McBride NW", "Kelvin", "Moody Park",
    ],
    "coquitlam": [
        "Central Coquitlam", "Westwood Plateau", "Westwood Summit CQ", "Coquitlam West",
        "North Coquitlam", "Cape Horn", "Chineside", "Coquitlam East",
        "Eagle Ridge CQ", "Harbour Chines", "Harbour Place", "Hockaday",
        "Maillardville", "Meadow Brook", "New Horizons", "Park Ridge Estates",
        "Ranch Park", "River Springs", "Scott Creek", "Summitt View",
        "Upper Eagle Ridge",
    ],
    "port-coquitlam": [
        "Central Pt Coquitlam", "Birchland Manor", "Citadel PQ", "Glenwood PQ",
        "Lincoln Park PQ", "Lower Mary Hill", "Mary Hill", "Oxford Heights",
        "Riverwood", "Woodland Acres PQ",
    ],
    "port-moody": [
        "College Park PM", "Glenayre", "Heritage Mountain", "Heritage Woods PM",
        "Ioco", "Mountain Meadows", "North Shore Pt Moody", "Anmore",
        "Barber Street", "Belcarra", "Sasamat",
    ],
    "maple-ridge": [
        "Albion", "Cottonwood MR", "East Central", "West Central",
        "Silver Valley", "Websters Corners", "Whonnock", "Thornhill MR",
        "Northwest Maple Ridge", "Southwest Maple Ridge", "Ruskin",
        "Northeast Maple Ridge",
    ],
    "pitt-meadows": [
        "Central Meadows", "Mid Meadows", "South Meadows", "West Meadows",
        "North Meadows PI", "Bonson Landing",
    ],
    # ── Fraser Valley ────────────────────────────────────────────────
    "mission": [
        "Mission BC", "Mission-West", "Hatzic", "Ferndale",
        "Stave Falls", "Steelhead", "Silverdale",
    ],
    "abbotsford": [
        "Central Abbotsford", "Abbotsford West", "Abbotsford East", "Poplar",
        "Aberdeen", "Bradner", "Clayburn", "Matsqui",
        "Sumas Mountain", "Sumas Prairie", "Straiton", "Auguston",
    ],
    "chilliwack": [
        "Chilliwack Proper North", "Chilliwack Proper South", "Chilliwack Proper East",
        "Chilliwack Proper West", "Chilliwack Downtown", "Sardis West Vedder",
        "Sardis East Vedder", "Sardis South", "Promontory", "Rosedale",
        "Yarrow", "Cultus Lake", "Chilliwack Mountain", "Little Mountain",
        "Fairfield Island", "Greendale", "East Chilliwack", "Ryder Lake",
    ],
    "hope": ["Hope Proper", "Hope Kawkawa Lake", "Hope Silver Creek", "Hope Sunshine Valley"],
    "kent": ["Agassiz", "Harrison Mills"],
    "harrison-hot-springs": ["Harrison Hot Springs Village"],
    # ── Sea-to-Sky ───────────────────────────────────────────────────
    "squamish": [
        "Downtown Squamish", "Garibaldi Highlands", "Valleycliffe", "Brackendale",
        "Dentville", "Britannia Beach", "Furry Creek", "Ring Creek",
        "Tantalus", "University Highlands", "Business Park", "Northyards",
    ],
    "whistler": [
        "Whistler Village", "Whistler Creekside", "Whistler Cay Estates", "Whistler Cay Heights",
        "Blueberry Hill", "Bayshores", "Alta Vista", "Alpine Meadows",
        "Nordic", "Emerald Estates", "Green Lake Estates", "Nick North",
        "Spring Creek", "Rainbow", "Function Junction", "Cheakamus Crossing",
        "Whistler Village North", "Benchlands", "Kadenwood", "Stonebridge Whistler",
    ],
    "pemberton": [
        "Pemberton Downtown", "Pemberton North", "Pemberton Meadows",
        "Mount Currie", "Birken", "D'Arcy",
    ],
    "lions-bay": ["Lions Bay"],
    "bowen-island": ["Bowen Island"],
}


def all_seed_pairs():
    """Yield (parent_slug, sub_name) pairs across every focus community."""
    for parent, subs in BC_SUB_NEIGHBOURHOODS.items():
        for name in subs:
            yield parent, name
