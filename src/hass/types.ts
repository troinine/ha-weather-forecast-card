export interface HassError {
  code: string;
  message: string;
}

export type InvalidEntityIdError = {
  code: "invalid_entity_id";
};

export type SubscriptionNotFoundError = {
  code: "not_found";
  message?: string;
};

export const isInvalidEntityIdError = (
  error: unknown
): error is InvalidEntityIdError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "invalid_entity_id"
  );
};

export const isSubscriptionNotFoundError = (
  error: unknown
): error is SubscriptionNotFoundError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "not_found"
  );
};
