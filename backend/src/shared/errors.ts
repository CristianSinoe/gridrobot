import createHttpError from "http-errors";

export const notFound = (message: string): Error => createHttpError(404, message);
export const badRequest = (message: string): Error => createHttpError(400, message);
