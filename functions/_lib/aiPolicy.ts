// AI policy enforcement and safe LLM wrapper

import { redactPII, redactFinancials } from "./redact.js";

export function requireAIEnabled(project) {
  // Check if project has AI analysis enabled (add this field to Project entity if needed)
  if (project?.settings?.ai_enabled === false) {
    throw new Error("AI analysis is disabled for this project. Enable in project settings.");
  }
  // Default to enabled if not explicitly set
  return true;
}

export function prepareAIPayload(data, options = {}) {
  const {
    redactPII: shouldRedactPII = true,
    redactFinancials: shouldRedactFinancials = true,
    allowedFields = null
  } = options;
  
  let payload = data;
  
  // Filter to allowed fields if specified
  if (allowedFields && Array.isArray(allowedFields)) {
    payload = buildMinimalPayload(data, allowedFields);
  }
  
  // Redact PII from text fields
  if (shouldRedactPII && typeof payload === "object") {
    payload = JSON.parse(redactPII(JSON.stringify(payload)));
  }
  
  // Redact financial details
  if (shouldRedactFinancials && typeof payload === "object") {
    payload = redactFinancials(payload);
  }
  
  return payload;
}

export async function callLLMSafe(base44, { prompt, payload, project_id }) {
  // Verify project allows AI
  if (project_id) {
    const project = await base44.entities.Project.filter({ id: project_id });
    if (project?.[0]) {
      requireAIEnabled(project[0]);
    }
  }
  
  // Prepare safe payload
  const safePayload = prepareAIPayload(payload, {
    redactPII: true,
    redactFinancials: true
  });
  
  const safePrompt = redactPII(prompt);
  
  // Call the Core.InvokeLLM integration
  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: safePrompt,
      add_context_from_internet: false // Default to no external context unless needed
    });
    
    return response;
  } catch (error) {
    console.error("LLM call failed:", error.message);
    throw new Error("AI analysis failed. Please try again or contact support.");
  }
}

function buildMinimalPayload(entity, allowedFields) {
  if (!entity || typeof entity !== "object") return null;
  
  const minimal = {};
  for (const field of allowedFields) {
    if (field in entity) {
      minimal[field] = entity[field];
    }
  }
  
  return minimal;
}