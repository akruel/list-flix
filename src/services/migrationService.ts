import { toast } from "sonner";

import { supabase } from "../lib/supabase";

export const migrationService = {
  /**
   * Migrates data from an anonymous user to a new authenticated user.
   * This calls a database function to perform the migration atomically.
   */
  async migrateAnonymousUserData(
    oldUserId: string,
    newUserId: string,
  ): Promise<void> {
    try {
      if (!oldUserId || !newUserId || oldUserId === newUserId) {
        return;
      }

      console.log(`Migrating data from ${oldUserId} to ${newUserId}`);

      const { error } = await supabase.rpc("migrate_user_data", {
        old_user_id: oldUserId,
        new_user_id: newUserId,
      });

      if (error) {
        console.error("Error migrating user data:", error);
        throw error;
      }

      toast.success("Suas listas e dados foram migrados com sucesso!", {
        id: "migration-success",
        duration: 3000,
        closeButton: false,
      });
    } catch (error) {
      console.error("Migration failed:", error);
      toast.error(
        "Houve um problema ao migrar seus dados. Por favor, contate o suporte.",
      );
    }
  },
};
