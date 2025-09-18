Write-Output "Script started"

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMxMzdlN2RkLTliYjgtNDk5Mi04N2ExLTkzNGY4YzQyNzg4NCIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTgwNzM3NDUsImV4cCI6MTc1ODY3ODU0NX0.7bHJynKnxDFiBnqnO9OiiQsoPzbeLNDvvBkmBhy_AV8"

# Call /screenshot endpoint
$screenshotUrl = "http://localhost:5000/api/chatbot/screenshot"
$bodyScreenshot = @{ videoId = "Ke43EELMDlM"; time = 1255 } | ConvertTo-Json
$headersScreenshot = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

Write-Output "Sending screenshot request..."
Try {
  $screenshotResponse = Invoke-WebRequest -Uri $screenshotUrl -Method Post -Headers $headersScreenshot -Body $bodyScreenshot -TimeoutSec 120
  Write-Output "Screenshot response received. Status: $($screenshotResponse.StatusCode)"
  
  $screenshotJson = $screenshotResponse.Content | ConvertFrom-Json
  $image = $screenshotJson.image
  
  # Save to screenshot.json
  $screenshotResponse.Content | Out-File -FilePath screenshot.json
  Write-Output "Screenshot saved to screenshot.json"
  
  $body = @{ message = "Please describe the content in the screenshot and extract any text"; image = $image } | ConvertTo-Json -Compress
  
  $headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
  
  Write-Output "Sending message request..."
  
  $response = Invoke-WebRequest -Uri "http://localhost:5000/api/chatbot/message" -Method Post -Headers $headers -Body $body -TimeoutSec 180
  
  Write-Output "Message response received. Status: $($response.StatusCode)"
  
  $response.Content | Out-File -FilePath chatbot_response.json
  Write-Output "Response saved to chatbot_response.json"
} Catch {
  Write-Output "Error: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    Write-Output "StatusCode: $($_.Exception.Response.StatusCode.Value__)"
    Write-Output "StatusDescription: $($_.Exception.Response.StatusDescription)"
  }
  
  if ($_.ErrorDetails.Message) {
    Write-Output "Error Details: $($_.ErrorDetails.Message)"
  }
}