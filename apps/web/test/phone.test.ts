import { expect, test } from "bun:test";
import { formatPhoneWithAreaCode } from "../lib/phone";

test("formats Brazilian phone numbers while typing", () => {
  expect(formatPhoneWithAreaCode("8")).toBe("(8");
  expect(formatPhoneWithAreaCode("85")).toBe("(85) ");
  expect(formatPhoneWithAreaCode("8599999999")).toBe("(85) 9999-9999");
  expect(formatPhoneWithAreaCode("85999999999")).toBe("(85) 99999-9999");
});

test("ignores nondigits and caps pasted phone numbers at eleven digits", () => {
  expect(formatPhoneWithAreaCode("(85) 99999-9999 ext. 123")).toBe(
    "(85) 99999-9999",
  );
  expect(formatPhoneWithAreaCode("abc(85) 99999-9999")).toBe("(85) 99999-9999");
});
