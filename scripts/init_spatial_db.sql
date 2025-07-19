-- GeoGPT Spatial Database Initialization Script
-- This script sets up PostGIS extensions and creates necessary tables for spatial operations

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- Create schema for GeoGPT spatial operations
CREATE SCHEMA IF NOT EXISTS geogpt_spatial;

-- Set search path to include the schema
SET search_path TO geogpt_spatial, public;

-- Table for storing spatial datasets and metadata
CREATE TABLE IF NOT EXISTS spatial_datasets (
    dataset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(255),
    data_type VARCHAR(50), -- raster, vector, point_cloud, etc.
    coordinate_system VARCHAR(100),
    bounds GEOMETRY(POLYGON, 4326),
    file_path TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing spatial analysis results
CREATE TABLE IF NOT EXISTS spatial_analysis_results (
    analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    analysis_type VARCHAR(100) NOT NULL,
    input_datasets UUID[] NOT NULL,
    parameters JSONB,
    result_geometry GEOMETRY,
    result_data JSONB,
    execution_time INTERVAL,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- Note: Foreign key to conversation_sessions will be handled by application layer
);

-- Table for storing map visualizations
CREATE TABLE IF NOT EXISTS map_visualizations (
    viz_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    center_point GEOMETRY(POINT, 4326),
    zoom_level INTEGER DEFAULT 10,
    layers JSONB, -- Layer configuration
    style_config JSONB, -- Map styling
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- Note: Foreign key to conversation_sessions will be handled by application layer
);

-- Table for storing spatial queries and their results
CREATE TABLE IF NOT EXISTS spatial_queries (
    query_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    query_text TEXT NOT NULL,
    query_geometry GEOMETRY,
    query_type VARCHAR(100), -- intersection, buffer, nearest, etc.
    result_count INTEGER,
    execution_time INTERVAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- Note: Foreign key to conversation_sessions will be handled by application layer
);

-- Table for caching geocoding results
CREATE TABLE IF NOT EXISTS geocoding_cache (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL,
    geocoded_point GEOMETRY(POINT, 4326),
    confidence_score FLOAT,
    provider VARCHAR(100),
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(address)
);

-- Create spatial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spatial_datasets_bounds ON spatial_datasets USING GIST (bounds);
CREATE INDEX IF NOT EXISTS idx_analysis_results_geometry ON spatial_analysis_results USING GIST (result_geometry);
CREATE INDEX IF NOT EXISTS idx_map_viz_center ON map_visualizations USING GIST (center_point);
CREATE INDEX IF NOT EXISTS idx_spatial_queries_geometry ON spatial_queries USING GIST (query_geometry);
CREATE INDEX IF NOT EXISTS idx_geocoding_point ON geocoding_cache USING GIST (geocoded_point);

-- Create regular indexes for non-spatial columns
CREATE INDEX IF NOT EXISTS idx_spatial_datasets_name ON spatial_datasets (name);
CREATE INDEX IF NOT EXISTS idx_analysis_session ON spatial_analysis_results (session_id);
CREATE INDEX IF NOT EXISTS idx_viz_session ON map_visualizations (session_id);
CREATE INDEX IF NOT EXISTS idx_queries_session ON spatial_queries (session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_type ON spatial_analysis_results (analysis_type);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_spatial_datasets_updated_at 
    BEFORE UPDATE ON spatial_datasets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate dataset bounds from geometries
CREATE OR REPLACE FUNCTION calculate_dataset_bounds(dataset_id UUID)
RETURNS GEOMETRY AS $$
DECLARE
    bounds_geom GEOMETRY;
BEGIN
    -- This is a placeholder - in practice, you'd calculate bounds from actual spatial data
    -- For now, we'll return a NULL geometry
    SELECT NULL::GEOMETRY INTO bounds_geom;
    RETURN bounds_geom;
END;
$$ LANGUAGE plpgsql;

-- Insert some example spatial datasets for testing
INSERT INTO spatial_datasets (name, description, data_type, coordinate_system) 
VALUES 
    ('OpenStreetMap Global', 'Global OpenStreetMap vector data', 'vector', 'EPSG:4326'),
    ('Sentinel-2 Imagery', 'Satellite imagery from ESA Sentinel-2', 'raster', 'EPSG:4326'),
    ('Global Administrative Boundaries', 'Country and administrative boundaries', 'vector', 'EPSG:4326')
ON CONFLICT DO NOTHING;

-- Grant permissions to the geogpt user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA geogpt_spatial TO geogpt;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA geogpt_spatial TO geogpt;
GRANT USAGE ON SCHEMA geogpt_spatial TO geogpt;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'GeoGPT spatial database initialization completed successfully!';
    RAISE NOTICE 'Created schema: geogpt_spatial';
    RAISE NOTICE 'Created tables: spatial_datasets, spatial_analysis_results, map_visualizations, spatial_queries, geocoding_cache';
    RAISE NOTICE 'PostGIS extensions enabled: postgis, postgis_topology, fuzzystrmatch, postgis_tiger_geocoder';
END $$; 