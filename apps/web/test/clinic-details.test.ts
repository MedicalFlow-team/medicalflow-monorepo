import { expect, test } from "bun:test";
import { clinicDetailsSchema, validCnpj } from "../lib/clinic-details";

const valid = {
  version: 0,
  legalName: "Clínica Vida Ltda",
  taxId: "11.222.333/0001-81",
  contactEmail: "contato@clinica.com.br",
  contactPhone: "85999999999",
  postalCode: "60000000",
  state: "CE",
  city: "Fortaleza",
  district: "Centro",
  street: "Rua das Flores",
  streetNumber: "10",
  addressComplement: "",
};

test("validates clinic legal, contact and address fields", () => {
  expect(validCnpj(valid.taxId)).toBe(true);
  expect(clinicDetailsSchema.safeParse(valid).success).toBe(true);
  expect(
    clinicDetailsSchema.safeParse({ ...valid, taxId: "11.222.333/0001-80" })
      .success,
  ).toBe(false);
  expect(
    clinicDetailsSchema.safeParse({ ...valid, postalCode: "abc" }).success,
  ).toBe(false);
  expect(clinicDetailsSchema.safeParse({ ...valid, city: "" }).success).toBe(
    false,
  );
});
