import { expect, test } from "bun:test";
import {
  clinicContactSchema,
  clinicDetailsResponseSchema,
  clinicDetailsSchema,
  formatCnpj,
  validCnpj,
} from "../lib/clinic-details";

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

test("formats CNPJ while typing and caps pasted values at fourteen digits", () => {
  expect(formatCnpj("112")).toBe("11.2");
  expect(formatCnpj("11222333")).toBe("11.222.333");
  expect(formatCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81");
  expect(formatCnpj("11.222.333/0001-8199")).toBe("11.222.333/0001-81");
});

test("validates clinic legal, contact and address fields", () => {
  expect(validCnpj(valid.taxId)).toBe(true);
  expect(clinicDetailsSchema.safeParse(valid).success).toBe(true);
  expect(
    clinicContactSchema.safeParse({ ...valid, contactPhone: "859999999999" })
      .success,
  ).toBe(false);
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

test("loads a newly created clinic before its required details are filled", () => {
  const empty = Object.fromEntries(
    Object.keys(valid)
      .filter((key) => key !== "version")
      .map((key) => [key, ""]),
  );
  expect(
    clinicDetailsResponseSchema.safeParse({
      ...empty,
      name: "Pet Saúde",
      slug: "pet-saude",
      version: 0,
      completed: false,
    }).success,
  ).toBe(true);
  expect(clinicDetailsSchema.safeParse({ ...empty, version: 0 }).success).toBe(
    false,
  );
});

test("contact can advance to address before address fields are filled", () => {
  const partial = {
    version: valid.version,
    legalName: valid.legalName,
    taxId: valid.taxId,
    contactEmail: valid.contactEmail,
    contactPhone: valid.contactPhone,
  };
  expect(clinicContactSchema.safeParse(partial).success).toBe(true);
  expect(
    clinicDetailsSchema.safeParse({ ...valid, postalCode: "" }).success,
  ).toBe(false);
  expect(
    clinicContactSchema.safeParse({ ...partial, contactEmail: "invalid" })
      .success,
  ).toBe(false);
});
