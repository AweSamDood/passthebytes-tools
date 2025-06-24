#!/bin/bash
# post-deploy-tests.sh

# This script runs tests against the live, publicly deployed application
# to ensure it is accessible and functioning correctly from the internet.

set -e

# The public URL of the deployed application is passed as the first argument
PUBLIC_URL=${1}

if [ -z "$PUBLIC_URL" ]; then
  echo "❌ Error: Public URL not provided. Please pass it as an argument to the script."
  exit 1
fi

echo "🧪 Running post-deployment tests on $PUBLIC_URL..."

# 1. Test Frontend Accessibility
echo "-- Testing frontend accessibility..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$PUBLIC_URL")
if [ "$response" != "200" ]; then
  echo "❌ Frontend returned HTTP $response from $PUBLIC_URL"
  exit 1
fi
echo "✅ Frontend is publicly accessible (HTTP $response)."

# 2. Test Public API Endpoint
API_INFO_URL="$PUBLIC_URL/api/png-to-pdf/info"
echo "-- Testing public API endpoint at $API_INFO_URL..."
api_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_INFO_URL")
if [ "$api_response" != "200" ]; then
  echo "❌ API endpoint returned HTTP $api_response from $API_INFO_URL"
  exit 1
fi
echo "✅ Public API endpoint is accessible (HTTP $api_response)."

# 3. Basic Performance Check
echo "-- Running basic performance check..."
start_time=$(date +%s.%3N)
curl -s "$PUBLIC_URL" > /dev/null
end_time=$(date +%s.%3N)
response_time=$(awk -v start="$start_time" -v end="$end_time" 'BEGIN {printf "%.3f", end - start}')
echo "✅ Public site response time: ${response_time}s"

echo "\n🎉 All post-deployment tests passed!"

