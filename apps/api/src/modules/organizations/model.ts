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
    }),
  ),
});
