// Bundle the pinned Supabase browser client. No credentials are embedded here.
require('esbuild').buildSync({
  stdin: { contents: "export { createClient } from '@supabase/supabase-js';", resolveDir: __dirname },
  bundle: true,
  format: 'iife',
  globalName: 'FloodSupabase',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  legalComments: 'eof',
  outfile: require('node:path').join(__dirname, 'dist/vendor/supabase.js'),
});
console.log('Built dist/vendor/supabase.js');
