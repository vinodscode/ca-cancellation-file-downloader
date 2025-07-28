-- Create the instruments_cache table in Supabase
-- Run this script in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS instruments_cache (
  id TEXT PRIMARY KEY,
  instruments_data JSONB NOT NULL,
  csv_metadata JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  record_count INTEGER DEFAULT 0,
  data_size_mb DECIMAL(10,2) DEFAULT 0,
  segments_included TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instruments_cache_last_updated ON instruments_cache(last_updated);
CREATE INDEX IF NOT EXISTS idx_instruments_cache_record_count ON instruments_cache(record_count);

-- Enable Row Level Security
ALTER TABLE instruments_cache ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations (adjust as needed for your security requirements)
DROP POLICY IF EXISTS "Allow all operations on instruments_cache" ON instruments_cache;
CREATE POLICY "Allow all operations on instruments_cache" ON instruments_cache
  FOR ALL USING (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_instruments_cache_updated_at ON instruments_cache;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_instruments_cache_updated_at 
  BEFORE UPDATE ON instruments_cache 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create a function to help with table creation (optional)
CREATE OR REPLACE FUNCTION create_instruments_table()
RETURNS void AS $$
BEGIN
  -- This function can be called via RPC if needed
  -- The table creation is already handled above
  RAISE NOTICE 'Instruments cache table setup completed';
END;
$$ language 'plpgsql';

-- Add some helpful comments
COMMENT ON TABLE instruments_cache IS 'Cache table for trading instruments data from Kite API';
COMMENT ON COLUMN instruments_cache.instruments_data IS 'Filtered and optimized instruments data in JSON format';
COMMENT ON COLUMN instruments_cache.csv_metadata IS 'Metadata about the original CSV file (size, headers, etc.)';
COMMENT ON COLUMN instruments_cache.segments_included IS 'Array of segments included in the filtered data';
COMMENT ON COLUMN instruments_cache.data_size_mb IS 'Size of the stored data in megabytes';
