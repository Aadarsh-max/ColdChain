export const cleanParams = (values) =>
  Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );