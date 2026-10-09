# =====================================================
# eMAG Marketplace API
# =====================================================

EMAG_BASE_URL=https://marketplace-api.emag.ro/api-3

EMAG_USERNAME=
EMAG_PASSWORD=

# Admin protection
EMAG_ADMIN_TOKEN=change-me

# =====================================================
# eMAG Product Defaults
# =====================================================

EMAG_BRAND=BEOK

EMAG_DEFAULT_EAN=0000000000000

EMAG_DEFAULT_WEIGHT_GRAMS=500

EMAG_DEFAULT_WIDTH_MM=100
EMAG_DEFAULT_HEIGHT_MM=100
EMAG_DEFAULT_LENGTH_MM=100

EMAG_VAT_ID=1

EMAG_WAREHOUSE_ID=1

EMAG_HANDLING_TIME_DAYS=1

EMAG_SOURCE_LANGUAGE=bg_BG

EMAG_PUBLIC_SITE_URL=https://www.beoksmart.com

# =====================================================
# Category Configuration
# =====================================================

EMAG_CATEGORY_ID_DEFAULT=0

EMAG_CATEGORY_MAP_JSON={
  "room-thermostat":0,
  "gas-boiler-thermostat":0,
  "trv":0,
  "hub-controller":0,
  "thermal-actuator":0
}

# =====================================================
# Security
# =====================================================

EMAG_WEBHOOK_ALLOWED_IPS=43.131.5.30,91.206.37.14,46.174.144.128

# =====================================================
# Sameday API BG
# =====================================================

# Live API base URL
SAMEDAY_BASE_URL=https://api.sameday.bg

# Official BG Swagger + Sandbox docs
# https://sameday-api-bg.demo.zitec.com/documentation/client

# Locker SDK docs
# https://cdn.sameday.ro/locker-plugin/techdoc.html

# API credentials (copy from one-time links into local env only)
SAMEDAY_USERNAME=
SAMEDAY_PASSWORD=

# API paths (v3.4)
SAMEDAY_AUTH_PATH=/api/authenticate
SAMEDAY_AUTH_REMEMBER_ME=true
SAMEDAY_AWB_PATH=/api/awb
SAMEDAY_LOCKERS_PATH=/api/client/ooh-locations

# Contract/account settings
SAMEDAY_CLIENT_ID=
SAMEDAY_PICKUP_POINT_ID=
SAMEDAY_SERVICE_ID=7
SAMEDAY_SERVICE_ID_ADDRESS=7
SAMEDAY_SERVICE_ID_EASYBOX=15

# Optional payload defaults
SAMEDAY_ENABLE_COD=false
SAMEDAY_PARCEL_WEIGHT_KG=1
SAMEDAY_PARCEL_LENGTH_CM=20
SAMEDAY_PARCEL_WIDTH_CM=15
SAMEDAY_PARCEL_HEIGHT_CM=10
SAMEDAY_PACKAGE_TYPE=0

# Optional fallback values
SAMEDAY_RECIPIENT_COUNTY_DEFAULT=
SAMEDAY_RECIPIENT_CITY_DEFAULT=

# Client/network tuning
SAMEDAY_REQUEST_TIMEOUT_MS=12000
SAMEDAY_RETRY_COUNT=2