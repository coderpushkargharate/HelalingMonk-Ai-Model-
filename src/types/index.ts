// Shared type re-exports for convenient `@/types` imports. The source-of-truth
// definitions live with their features/services.
export type { Role, AuthUser } from '@/services/api';
export type { PatientInfo, AssessmentCapture, ExtraShot } from '@/lib/clinicalKnowledge';
