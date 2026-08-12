export type GuardResult =
  | { allowed: true; answer: string }
  | { allowed: false; status: 'declined'; message: string; help: string };

const blockedPatterns = [
  /illegal/i,
  /forbidden/i,
  /harmful/i,
  /bypass security/i,
  /exploit/i,
  /malware/i,
  /unsafe behavior/i
];

export function evaluateRequest(request: string): GuardResult {
  const text = request.trim().toLowerCase();

  const isBlocked = blockedPatterns.some((pattern) => pattern.test(text));

  if (isBlocked) {
    return {
      allowed: false,
      status: 'declined',
      message: "I can't help with that kind of request.",
      help: 'I can help with safe, allowed alternatives instead.'
    };
  }

  return {
    allowed: true,
    answer: 'I can help with that in a safe and compliant way.'
  };
}

export function handleUnsupportedTopic(input: string): string {
  const normalized = input.toLowerCase();

  const unsupported = [
    'illegal activity',
    'malware',
    'bypass',
    'exploit',
    'harmful behavior'
  ];

  const match = unsupported.some((phrase) => normalized.includes(phrase));

  if (match) {
    return 'This request falls outside the safe scope I can support. I can help with a compliant alternative instead.';
  }

  return 'I can assist with that safely.';
}

const requestGuard = {
  evaluateRequest,
  handleUnsupportedTopic
};

export default requestGuard;
