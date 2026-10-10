import { expect, test } from "bun:test";
import {
  formatPostalCode,
  parsePostalCodeAddress,
  postalCodeDigits,
} from "../lib/postal-code";

test("accepts only eight CEP digits", () => {
  expect(postalCodeDigits("01001-000")).toBe("01001000");
  expect(postalCodeDigits("01001-000999")).toBe("01001000");
});

test("formats CEP as five digits, hyphen, three digits", () => {
  expect(formatPostalCode("01001")).toBe("01001");
  expect(formatPostalCode("010010")).toBe("01001-0");
  expect(formatPostalCode("01001-000999")).toBe("01001-000");
});

test("maps ViaCEP address fields without number or complement", () => {
  expect(
    parsePostalCodeAddress({
      uf: "SP",
      localidade: "São Paulo",
      bairro: "Sé",
      logradouro: "Praça da Sé",
      complemento: "lado ímpar",
    }),
  ).toEqual({
    state: "SP",
    city: "São Paulo",
    district: "Sé",
    street: "Praça da Sé",
  });
  expect(parsePostalCodeAddress({ erro: true })).toBeNull();
  expect(parsePostalCodeAddress({ uf: "SP" })).toBeNull();
});
