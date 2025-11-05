#!/bin/bash

# x402 Image Uploader API Test Script
# This script demonstrates the x402 payment flow with real API calls

SERVER_URL="http://localhost:3001"
TEST_IMAGE_PATH="${1:-test-image.jpg}"

echo "🚀 x402 Image Uploader - API Test"
echo "=================================="
echo "Server: $SERVER_URL"
echo "Image: $TEST_IMAGE_PATH"
echo ""

# Test 1: Health Check
echo "🏥 Testing health endpoint..."
curl -s "$SERVER_URL/health" | jq '.' || echo "Health check failed"
echo ""

# Test 2: Upload Image (will require payment)
echo "📤 Testing upload endpoint (expecting 402 Payment Required)..."
echo ""

if [ -f "$TEST_IMAGE_PATH" ]; then
    echo "📁 Using image file: $TEST_IMAGE_PATH"
    
    # Make the upload request
    echo "Making upload request..."
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X POST \
        -F "image=@$TEST_IMAGE_PATH" \
        -H "x-user-address: test-user-$(date +%s)" \
        "$SERVER_URL/upload")
    
    # Extract HTTP status and response body
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
    
    echo "HTTP Status: $HTTP_STATUS"
    echo "Response:"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    
    if [ "$HTTP_STATUS" = "402" ]; then
        echo ""
        echo "💳 Payment Required (HTTP 402) - This is expected!"
        echo "The x402 protocol is working correctly."
        echo ""
        echo "🔍 Payment Requirements Details:"
        echo "$RESPONSE_BODY" | jq '.accepts[0]' 2>/dev/null || echo "Could not parse payment requirements"
        echo ""
        echo "📋 Next Steps:"
        echo "1. Use x402-fetch or x402-axios for automatic payment handling"
        echo "2. Implement payment with x402 SDK and wallet integration"
        echo "3. Example with x402-fetch:"
        echo "   const response = await x402Fetch('$SERVER_URL/upload', {"
        echo "     method: 'POST',"
        echo "     body: formData,"
        echo "     payment: { wallet: yourWallet, maxAmount: 0.05 }"
        echo "   });"
    elif [ "$HTTP_STATUS" = "201" ]; then
        echo ""
        echo "✅ Upload successful! (Payment was processed or price is \$0)"
        echo "$RESPONSE_BODY" | jq '.url' 2>/dev/null | sed 's/"//g' | while read url; do
            echo "🖼️  Image URL: $url"
        done
    else
        echo ""
        echo "❌ Unexpected response"
    fi
else
    echo "❌ Image file not found: $TEST_IMAGE_PATH"
    echo "💡 Create a test image or specify a path:"
    echo "   ./test-api.sh path/to/your/image.jpg"
    echo ""
    echo "🎨 To create a simple test image:"
    echo "   convert -size 100x100 xc:blue test-image.jpg  # ImageMagick"
    echo "   # Or just download any image file"
fi

echo ""

# Test 3: List Images
echo "📋 Testing images list endpoint..."
curl -s "$SERVER_URL/images" | jq '.images | length' | while read count; do
    echo "Found $count uploaded images"
done

echo ""
echo "🎉 API test completed!"
echo ""
echo "💡 Tips:"
echo "  - Make sure server is running: npm run dev"
echo "  - Check environment variables in .env file"
echo "  - For payment testing, use x402 client libraries"