# MailSafePro Zap Templates

This directory contains recommended Zap templates for the MailSafePro integration.
These templates help users get started quickly with common email validation workflows.

## Available Templates

### 1. Lead Validation Workflow
**File:** `lead-validation.json`
**Trigger:** New Lead in CRM (HubSpot, Salesforce, etc.)
**Action:** Validate Email → Update Lead Status

### 2. Form Submission Validation
**File:** `form-validation.json`
**Trigger:** New Form Submission (Typeform, Google Forms, etc.)
**Action:** Validate Email → Add to Email List or Reject

### 3. Batch List Hygiene
**File:** `batch-list-hygiene.json`
**Trigger:** New File in Google Drive/Dropbox
**Action:** Batch Validate → Export Clean List

### 4. High-Risk Email Alert
**File:** `high-risk-alert.json`
**Trigger:** New High-Risk Email Detected
**Action:** Send Slack/Email Notification → Add to Suppression List

### 5. Signup Fraud Prevention
**File:** `signup-fraud-prevention.json`
**Trigger:** New User Signup
**Action:** Validate Email → Block if Spam Trap → Notify Security Team

### 6. Email List Segmentation
**File:** `email-list-segmentation.json`
**Trigger:** Batch Validation Complete
**Action:** Segment by Quality Score → Update CRM Tags

### 7. Bounce Prevention
**File:** `bounce-prevention.json`
**Trigger:** Before Email Campaign Send
**Action:** Validate Recipients → Remove Invalid → Send Campaign

### 8. Real-time Validation API
**File:** `realtime-validation.json`
**Trigger:** Webhook from Your App
**Action:** Validate Email → Return Result via Webhook

## How to Use

1. Import the template JSON into Zapier
2. Connect your MailSafePro account
3. Connect your other apps (CRM, Email, etc.)
4. Customize the workflow as needed
5. Turn on the Zap

## Template Structure

Each template includes:
- `name`: Template name
- `description`: What the template does
- `trigger`: The trigger configuration
- `actions`: Array of action configurations
- `filters`: Optional filter conditions

## Creating Custom Templates

Use these templates as a starting point for your own workflows.
The MailSafePro integration supports:

- **Triggers:** Validate Email, Batch Complete Webhook, New Validation Completed, New High-Risk Email
- **Actions:** Batch Validate, Cancel Batch, Add to Suppression List, Remove from Suppression List
- **Searches:** Get Usage, Get Batch Status, Get Batch Results, Find Email

For more information, visit: https://docs.mailsafepro.com/integrations/zapier
