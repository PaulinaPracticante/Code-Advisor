//error que se responde tal cual al cliente con su codigo http (400 datos invalidos, 401 sin permiso, etc.)
export class HttpError extends Error {
	constructor(public readonly status: number, message: string) {
		super(message);
	}
}
