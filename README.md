# x402 Pay-to-Use Image Uploader Service



https://github.com/user-attachments/assets/b5a13bd8-e50c-43d4-898c-ad3f6adce137



- Here, we are building a simple pay-to-use image uploader service with x402 payment protocol and supabase storage
- A simple pay-to-use image uploader service built with x402 payment protocol and Supabase storage.

1. Endpoint: POST /upload — pay-per-upload (e.g. $0.01)

2. Storage: Supabase Storage bucket images

3. Database: a Supabase table images (id, user_address (optional), path, uploaded_at, mime)

4. x402 protection: x402-express payment middleware protecting /upload

5. Client: page or curl that handles 402 responses, calls x402 client helper to pay and retries with X-PAYMENT. (You can use x402-fetch/axios helpers or wallet libraries; quickstart guides show examples).


# Endpoints

```bash
# health check
curl -I http://localhost:3001/health
# test upload (requires payment)
curl -X POST -F "image=@test-image.png" http://localhost:3001/upload
```



# Resources

1. **x402 payment protocol**: https://github.com/anuragShingare30/x402/
2. **Supabase storage**: https://supabase.com/docs
3. **Supabase-js sdk**: https://github.com/supabase/supabase-js
