-- Demo seed: creates a demo client with an API key and active subscription
-- Run after db/schema.sql

INSERT INTO clients (id, name, email, business_name, openai_assistant_id, subscription_status, api_key)
VALUES (
  gen_random_uuid(), -- if uuid extension present, otherwise replace with explicit uuid_generate_v4()
  'Demo Client',
  'demo@ascendigit.local',
  'Demo Business',
  '', -- optionally place an existing OpenAI assistant id here
  'active',
  'demo-client-api-key-123'
);