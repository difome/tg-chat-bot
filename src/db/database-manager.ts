import "dotenv/config";
import {drizzle, LibSQLDatabase} from "drizzle-orm/libsql";
import {Environment} from "../common/environment";
import {logError} from "../util/utils";

export class DatabaseManager {

    static db: LibSQLDatabase;

    static init() {
        try {
            DatabaseManager.db = drizzle(Environment.DB_PATH);
        } catch (e) {
            logError(e);
        }
    }
}