"""
Example Integrated GIS Workflows for GeoGPT-RAG
Demonstrates how to use PyQGIS, WhiteboxTools, Planetary Computer, and Bhoonidhi APIs
"""

import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# PyQGIS imports
try:
    from qgis.core import (
        QgsApplication, QgsVectorLayer, QgsRasterLayer,
        QgsProcessingFeedback, QgsProject
    )
    import processing
    QGIS_AVAILABLE = True
except ImportError:
    QGIS_AVAILABLE = False
    print("PyQGIS not available. Install QGIS for full functionality.")

# WhiteboxTools
try:
    import whitebox
    WBT_AVAILABLE = True
except ImportError:
    WBT_AVAILABLE = False
    print("WhiteboxTools not available. Install with: pip install whitebox")

# Planetary Computer
try:
    import planetary_computer as pc
    import pystac_client
    from odc.stac import load
    PC_AVAILABLE = True
except ImportError:
    PC_AVAILABLE = False
    print("Planetary Computer libraries not available. Install required packages.")

# Standard geospatial libraries
import geopandas as gpd
import rasterio
import folium
from shapely.geometry import box


class IntegratedGISWorkflow:
    """Main class for integrated GIS workflows in GeoGPT"""
    
    def __init__(self, working_dir="./gis_workspace"):
        self.working_dir = working_dir
        os.makedirs(working_dir, exist_ok=True)
        
        # Initialize tools
        self._init_qgis()
        self._init_whitebox()
        self._init_planetary_computer()
    
    def _init_qgis(self):
        """Initialize QGIS application"""
        if QGIS_AVAILABLE:
            # Create QGIS application
            QgsApplication.setPrefixPath("/usr", True)
            self.qgs = QgsApplication([], False)
            self.qgs.initQgis()
            print("✓ QGIS initialized successfully")
    
    def _init_whitebox(self):
        """Initialize WhiteboxTools"""
        if WBT_AVAILABLE:
            self.wbt = whitebox.WhiteboxTools()
            self.wbt.set_working_dir(self.working_dir)
            self.wbt.verbose = False
            print("✓ WhiteboxTools initialized successfully")
    
    def _init_planetary_computer(self):
        """Initialize Planetary Computer connection"""
        if PC_AVAILABLE:
            self.pc_catalog = pystac_client.Client.open(
                "https://planetarycomputer.microsoft.com/api/stac/v1",
                modifier=pc.sign_inplace
            )
            print("✓ Planetary Computer connection established")
    
    # Example Workflow 1: Flood Risk Assessment
    def flood_risk_assessment(self, area_of_interest, date_range):
        """
        Comprehensive flood risk assessment workflow
        
        Args:
            area_of_interest: GeoDataFrame or bbox tuple (minx, miny, maxx, maxy)
            date_range: Tuple of (start_date, end_date) strings
        """
        print("\n🌊 Starting Flood Risk Assessment Workflow...")
        
        # Step 1: Get elevation data from Planetary Computer
        print("1. Fetching elevation data...")
        dem_path = self._fetch_dem_data(area_of_interest)
        
        # Step 2: Hydrological analysis with WhiteboxTools
        print("2. Running hydrological analysis...")
        flow_acc_path = self._hydrological_analysis(dem_path)
        
        # Step 3: Get rainfall data
        print("3. Fetching rainfall data...")
        rainfall_path = self._fetch_rainfall_data(area_of_interest, date_range)
        
        # Step 4: Flood modeling with PyQGIS
        print("4. Running flood risk modeling...")
        flood_zones = self._flood_modeling(flow_acc_path, rainfall_path)
        
        # Step 5: Generate risk map
        print("5. Generating flood risk map...")
        risk_map_path = self._generate_risk_map(flood_zones, area_of_interest)
        
        return risk_map_path
    
    def _fetch_dem_data(self, aoi):
        """Fetch DEM from Planetary Computer"""
        if not PC_AVAILABLE:
            return None
            
        # Search for Copernicus DEM
        search = self.pc_catalog.search(
            collections=["cop-dem-glo-30"],
            intersects=aoi
        )
        
        items = list(search.items())
        if items:
            # Load DEM
            dem = load(items, bands=["data"])
            dem_path = os.path.join(self.working_dir, "dem.tif")
            dem.to_netcdf(dem_path)
            return dem_path
        return None
    
    def _hydrological_analysis(self, dem_path):
        """Run hydrological analysis using WhiteboxTools"""
        if not WBT_AVAILABLE or not dem_path:
            return None
            
        # Fill depressions
        filled_dem = os.path.join(self.working_dir, "filled_dem.tif")
        self.wbt.fill_depressions(dem_path, filled_dem)
        
        # Flow direction
        flow_dir = os.path.join(self.working_dir, "flow_direction.tif")
        self.wbt.d8_pointer(filled_dem, flow_dir)
        
        # Flow accumulation
        flow_acc = os.path.join(self.working_dir, "flow_accumulation.tif")
        self.wbt.d8_flow_accumulation(flow_dir, flow_acc, log_transform=True)
        
        return flow_acc
    
    def _fetch_rainfall_data(self, aoi, date_range):
        """Fetch rainfall data from Planetary Computer (CHIRPS)"""
        if not PC_AVAILABLE:
            return None
            
        # Search for CHIRPS precipitation data
        search = self.pc_catalog.search(
            collections=["chirps-monthly"],
            intersects=aoi,
            datetime=f"{date_range[0]}/{date_range[1]}"
        )
        
        items = list(search.items())
        if items:
            # Load and aggregate rainfall
            rainfall = load(items, bands=["precipitation"])
            rainfall_sum = rainfall.sum(dim="time")
            rainfall_path = os.path.join(self.working_dir, "rainfall.tif")
            rainfall_sum.to_netcdf(rainfall_path)
            return rainfall_path
        return None
    
    def _flood_modeling(self, flow_acc_path, rainfall_path):
        """Run flood modeling using PyQGIS"""
        if not QGIS_AVAILABLE:
            return None
            
        # This is a simplified example
        # In reality, you would use more sophisticated flood models
        return flow_acc_path
    
    def _generate_risk_map(self, flood_zones, aoi):
        """Generate final flood risk map"""
        # Create visualization
        risk_map_path = os.path.join(self.working_dir, "flood_risk_map.html")
        
        # Simple folium map
        m = folium.Map()
        folium.GeoJson(aoi).add_to(m)
        m.save(risk_map_path)
        
        print(f"✓ Flood risk map saved to: {risk_map_path}")
        return risk_map_path
    
    # Example Workflow 2: Crop Health Monitoring
    def crop_health_monitoring(self, farm_boundary, monitoring_period):
        """
        Monitor crop health using satellite imagery
        
        Args:
            farm_boundary: GeoDataFrame of farm boundaries
            monitoring_period: Number of days to monitor
        """
        print("\n🌾 Starting Crop Health Monitoring Workflow...")
        
        # Step 1: Get Sentinel-2 time series
        print("1. Fetching Sentinel-2 imagery time series...")
        imagery_dates = self._fetch_sentinel2_timeseries(
            farm_boundary, 
            monitoring_period
        )
        
        # Step 2: Calculate vegetation indices
        print("2. Calculating vegetation indices...")
        ndvi_series = self._calculate_vegetation_indices(imagery_dates)
        
        # Step 3: Field-level statistics
        print("3. Computing field-level statistics...")
        field_stats = self._compute_field_statistics(ndvi_series, farm_boundary)
        
        # Step 4: Generate health report
        print("4. Generating crop health report...")
        report_path = self._generate_health_report(field_stats)
        
        return report_path
    
    def _fetch_sentinel2_timeseries(self, aoi, days):
        """Fetch Sentinel-2 time series from Planetary Computer"""
        if not PC_AVAILABLE:
            return []
            
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        search = self.pc_catalog.search(
            collections=["sentinel-2-l2a"],
            intersects=aoi,
            datetime=f"{start_date.isoformat()}/{end_date.isoformat()}",
            query={"eo:cloud_cover": {"lt": 20}}
        )
        
        items = list(search.items())
        print(f"  Found {len(items)} Sentinel-2 scenes")
        return items
    
    def _calculate_vegetation_indices(self, imagery):
        """Calculate NDVI and other vegetation indices"""
        ndvi_results = []
        
        for item in imagery:
            # Load NIR and Red bands
            data = load([item], bands=["B08", "B04"], resolution=10)
            
            # Calculate NDVI
            ndvi = (data["B08"] - data["B04"]) / (data["B08"] + data["B04"])
            ndvi_results.append({
                "date": item.datetime,
                "ndvi": ndvi
            })
        
        return ndvi_results
    
    def _compute_field_statistics(self, ndvi_series, fields):
        """Compute statistics for each field"""
        if not WBT_AVAILABLE:
            return None
            
        stats = []
        for idx, field in fields.iterrows():
            field_stats = {
                "field_id": idx,
                "area_ha": field.geometry.area / 10000,
                "ndvi_mean": [],
                "ndvi_std": []
            }
            
            for ndvi_data in ndvi_series:
                # Use WhiteboxTools for zonal statistics
                # This is a simplified example
                field_stats["ndvi_mean"].append(0.75)  # Placeholder
                field_stats["ndvi_std"].append(0.1)    # Placeholder
            
            stats.append(field_stats)
        
        return pd.DataFrame(stats)
    
    def _generate_health_report(self, stats):
        """Generate crop health report"""
        report_path = os.path.join(self.working_dir, "crop_health_report.html")
        
        # Create simple HTML report
        html_content = f"""
        <html>
        <head><title>Crop Health Report</title></head>
        <body>
            <h1>Crop Health Monitoring Report</h1>
            <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
            <h2>Summary Statistics</h2>
            <p>Number of fields monitored: {len(stats)}</p>
            <p>Total area: {stats['area_ha'].sum():.2f} hectares</p>
            <h2>Field Details</h2>
            {stats.to_html()}
        </body>
        </html>
        """
        
        with open(report_path, 'w') as f:
            f.write(html_content)
        
        print(f"✓ Crop health report saved to: {report_path}")
        return report_path
    
    # Example Workflow 3: Urban Growth Analysis
    def urban_growth_analysis(self, city_boundary, start_year, end_year):
        """
        Analyze urban expansion using multi-temporal satellite data
        
        Args:
            city_boundary: GeoDataFrame of city boundary
            start_year: Start year for analysis
            end_year: End year for analysis
        """
        print(f"\n🏙️ Starting Urban Growth Analysis ({start_year}-{end_year})...")
        
        # Step 1: Get historical Landsat data
        print("1. Fetching historical Landsat imagery...")
        landsat_start = self._fetch_landsat_data(city_boundary, start_year)
        landsat_end = self._fetch_landsat_data(city_boundary, end_year)
        
        # Step 2: Classify urban areas
        print("2. Classifying urban areas...")
        urban_start = self._classify_urban_areas(landsat_start)
        urban_end = self._classify_urban_areas(landsat_end)
        
        # Step 3: Change detection
        print("3. Detecting urban expansion...")
        expansion_areas = self._detect_urban_expansion(urban_start, urban_end)
        
        # Step 4: Calculate metrics
        print("4. Calculating urban growth metrics...")
        growth_metrics = self._calculate_growth_metrics(
            urban_start, urban_end, expansion_areas
        )
        
        # Step 5: Generate visualization
        print("5. Creating urban growth visualization...")
        viz_path = self._create_growth_visualization(
            expansion_areas, city_boundary, growth_metrics
        )
        
        return viz_path
    
    def _fetch_landsat_data(self, aoi, year):
        """Fetch Landsat data for a specific year"""
        if not PC_AVAILABLE:
            return None
            
        search = self.pc_catalog.search(
            collections=["landsat-c2-l2"],
            intersects=aoi,
            datetime=f"{year}-01-01/{year}-12-31",
            query={"eo:cloud_cover": {"lt": 10}}
        )
        
        items = list(search.items())
        if items:
            # Select best scene (lowest cloud cover)
            best_scene = min(items, key=lambda x: x.properties.get("eo:cloud_cover", 100))
            return best_scene
        return None
    
    def _classify_urban_areas(self, landsat_scene):
        """Classify urban areas from Landsat imagery"""
        if not landsat_scene:
            return None
            
        # Load spectral bands
        data = load(
            [landsat_scene], 
            bands=["red", "green", "blue", "nir08", "swir16"],
            resolution=30
        )
        
        # Simple urban classification using spectral indices
        # NDBI (Normalized Difference Built-up Index)
        ndbi = (data["swir16"] - data["nir08"]) / (data["swir16"] + data["nir08"])
        
        # Threshold to identify urban areas
        urban_mask = ndbi > 0.1
        
        return urban_mask
    
    def _detect_urban_expansion(self, urban_start, urban_end):
        """Detect areas of urban expansion"""
        if urban_start is None or urban_end is None:
            return None
            
        # New urban areas = urban_end AND NOT urban_start
        expansion = urban_end & ~urban_start
        
        return expansion
    
    def _calculate_growth_metrics(self, urban_start, urban_end, expansion):
        """Calculate urban growth metrics"""
        metrics = {
            "start_urban_area_km2": 0,
            "end_urban_area_km2": 0,
            "expansion_area_km2": 0,
            "growth_rate_percent": 0
        }
        
        if urban_start is not None:
            # Calculate areas (assuming 30m resolution)
            pixel_area_km2 = (30 * 30) / 1_000_000
            
            metrics["start_urban_area_km2"] = float(urban_start.sum()) * pixel_area_km2
            metrics["end_urban_area_km2"] = float(urban_end.sum()) * pixel_area_km2
            metrics["expansion_area_km2"] = float(expansion.sum()) * pixel_area_km2
            
            if metrics["start_urban_area_km2"] > 0:
                metrics["growth_rate_percent"] = (
                    (metrics["expansion_area_km2"] / metrics["start_urban_area_km2"]) * 100
                )
        
        return metrics
    
    def _create_growth_visualization(self, expansion, boundary, metrics):
        """Create urban growth visualization"""
        viz_path = os.path.join(self.working_dir, "urban_growth_map.html")
        
        # Create folium map
        m = folium.Map()
        
        # Add city boundary
        folium.GeoJson(
            boundary,
            name="City Boundary",
            style_function=lambda x: {
                "fillColor": "none",
                "color": "black",
                "weight": 2
            }
        ).add_to(m)
        
        # Add metrics to map
        metrics_html = f"""
        <div style='position: fixed; top: 10px; right: 10px; 
                    background: white; padding: 10px; border: 1px solid black;'>
            <h4>Urban Growth Metrics</h4>
            <p>Expansion Area: {metrics['expansion_area_km2']:.2f} km²</p>
            <p>Growth Rate: {metrics['growth_rate_percent']:.1f}%</p>
        </div>
        """
        m.get_root().html.add_child(folium.Element(metrics_html))
        
        m.save(viz_path)
        print(f"✓ Urban growth visualization saved to: {viz_path}")
        return viz_path
    
    def cleanup(self):
        """Clean up resources"""
        if QGIS_AVAILABLE:
            self.qgs.exitQgis()
            print("✓ QGIS cleaned up")


# Example usage
if __name__ == "__main__":
    # Initialize workflow
    workflow = IntegratedGISWorkflow()
    
    # Example 1: Flood risk for a city
    city_bbox = box(77.5, 13.0, 77.7, 13.2)  # Bangalore bbox
    city_gdf = gpd.GeoDataFrame([1], geometry=[city_bbox], crs="EPSG:4326")
    
    try:
        flood_map = workflow.flood_risk_assessment(
            city_gdf,
            ("2024-01-01", "2024-06-30")
        )
        print(f"Flood risk assessment complete: {flood_map}")
    except Exception as e:
        print(f"Error in flood assessment: {e}")
    
    # Example 2: Crop monitoring
    farm_bbox = box(75.0, 15.0, 75.1, 15.1)  # Example farm
    farm_gdf = gpd.GeoDataFrame([1], geometry=[farm_bbox], crs="EPSG:4326")
    
    try:
        health_report = workflow.crop_health_monitoring(farm_gdf, 30)
        print(f"Crop health report complete: {health_report}")
    except Exception as e:
        print(f"Error in crop monitoring: {e}")
    
    # Example 3: Urban growth
    try:
        growth_viz = workflow.urban_growth_analysis(city_gdf, 2015, 2024)
        print(f"Urban growth analysis complete: {growth_viz}")
    except Exception as e:
        print(f"Error in urban analysis: {e}")
    
    # Cleanup
    workflow.cleanup() 