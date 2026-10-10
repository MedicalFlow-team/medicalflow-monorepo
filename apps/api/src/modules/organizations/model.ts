import { t } from "elysia";

export const organizationsResponse = t.Object({
  data: t.Array(
    t.Object({
      id: t.String(),
      name: t.String(),
      slug: t.String(),
      role: t.Union([
        t.Literal("ADMIN"),
        t.Literal("PROFESSIONAL"),
        t.Literal("RECEPTIONIST"),
      ]),
      status: t.Literal("ACTIVE"),
    }),
  ),
});

export const clinicDetailsBody = t.Object({
  version: t.Integer({ minimum: 0 }),
  legalName: t.String({ minLength: 2, maxLength: 160 }),
  taxId: t.String({ maxLength: 18 }),
  contactEmail: t.String({ format: "email", maxLength: 254 }),
  contactPhone: t.String({ minLength: 10, maxLength: 20 }),
  postalCode: t.String({ pattern: "^[0-9]{8}$" }),
  state: t.String({ pattern: "^[A-Za-z]{2}$" }),
  city: t.String({ minLength: 2, maxLength: 100 }),
  district: t.String({ minLength: 2, maxLength: 100 }),
  street: t.String({ minLength: 2, maxLength: 160 }),
  streetNumber: t.String({ minLength: 1, maxLength: 20 }),
  addressComplement: t.String({ maxLength: 100 }),
});

export const clinicContactBody = t.Pick(clinicDetailsBody, [
  "version",
  "legalName",
  "taxId",
  "contactEmail",
  "contactPhone",
]);
export const clinicAddressBody = t.Pick(clinicDetailsBody, [
  "version",
  "postalCode",
  "state",
  "city",
  "district",
  "street",
  "streetNumber",
  "addressComplement",
]);

export const clinicDetailsResponse = t.Object({
  name: t.String(),
  slug: t.String(),
  version: t.Integer(),
  completed: t.Boolean(),
  legalName: t.String(),
  taxId: t.String(),
  contactEmail: t.String(),
  contactPhone: t.String(),
  postalCode: t.String(),
  state: t.String(),
  city: t.String(),
  district: t.String(),
  street: t.String(),
  streetNumber: t.String(),
  addressComplement: t.String(),
});

export type ClinicDetailsBody = typeof clinicDetailsBody.static;
export type ClinicContactBody = typeof clinicContactBody.static;
export type ClinicAddressBody = typeof clinicAddressBody.static;
