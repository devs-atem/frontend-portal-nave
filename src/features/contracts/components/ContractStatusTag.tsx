import { StatusTag, type StatusTagStatus } from "@devs-atem/design-system";
import { CONTRACT_STATUS_LABEL, type ContractStatus } from "../services/contract";

const TONE: Record<ContractStatus, StatusTagStatus> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "pending",
  ACTIVE: "success",
  SUSPENDED: "warning",
  CLOSING: "info",
  CLOSED: "neutral",
  CANCELLED: "error",
  EXPIRED: "neutral",
};

export const ContractStatusTag = ({ status }: { status: ContractStatus }) => (
  <StatusTag
    label={CONTRACT_STATUS_LABEL[status] ?? status}
    status={TONE[status] ?? "neutral"}
    size="sm"
  />
);
