'use strict';

exports.handler = async function() {
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enabled: Boolean(url && anonKey),
      supabaseUrl: url,
      supabaseAnonKey: anonKey
    })
  };
};
