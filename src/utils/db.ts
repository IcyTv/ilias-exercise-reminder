import { CookieJar } from "tough-cookie";
import { JsonDB } from "node-json-db";
import { Config } from "node-json-db/dist/lib/JsonDBConfig";

interface DB {
	userMap: {
		[code: string]: string;
	};
	users: {
		resource: string;
		token?: string | undefined;
		cookieJar: CookieJar.Serialized;
		query: string;
	}[];
}

const db = new JsonDB(
	new Config("db", true, process.env.NODE_ENV !== "production", "/")
);

export default db;

// const db = low(new FileAdapter<DB>("db.json"));
// export default db.then((db) =>
// 	db.defaults({
// 		users: [],
// 	})
// );
