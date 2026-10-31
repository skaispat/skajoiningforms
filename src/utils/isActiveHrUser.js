// HR-stage approval is allowed only for an active user whose designation AND department are HR (users table)
export const isActiveHrUser = (user) => {
  if (!user) return false;
  const isHr = (value) => String(value || "").trim().toLowerCase() === "hr";
  return isHr(user.designation) && isHr(user.department) && user.is_active === true;
};
