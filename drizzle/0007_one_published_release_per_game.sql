CREATE UNIQUE INDEX "one_published_release_per_game_idx"
  ON "game_data_releases" USING btree ("game_id")
  WHERE "status" = 'published';
