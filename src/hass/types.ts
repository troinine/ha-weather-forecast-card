export interface HassError {
  code: string;
  message: string;
}

export type InvalidEntityIdError = {
  code: "invalid_entity_id";
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
