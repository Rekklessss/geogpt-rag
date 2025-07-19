"""
Map Visualization and GIS Operations System for GeoGPT
Handles map generation, spatial analysis, and visualization workflows
"""

import os
import json
import logging
import uuid
import tempfile
import folium
import geopandas as gpd
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass
from enum import Enum
import requests
import io
import base64
from PIL import Image
from shapely.geometry import Point, Polygon, LineString, box
from shapely.ops import unary_union
import contextily as ctx
import matplotlib.pyplot as plt
import rasterio
from rasterio.plot import show
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

logger = logging.getLogger(__name__)

class MapProvider(Enum):
    """Supported map providers"""
    OPENSTREETMAP = "openstreetmap"
    SATELLITE = "satellite"
    TERRAIN = "terrain"
    MAPBOX = "mapbox"
    GOOGLE = "google"

class AnalysisType(Enum):
    """Supported spatial analysis types"""
    BUFFER = "buffer"
    INTERSECTION = "intersection"
    UNION = "union"
    CLIP = "clip"
    NEAREST = "nearest"
    DISTANCE = "distance"
    AREA = "area"
    CENTROID = "centroid"
    CONVEX_HULL = "convex_hull"
    DENSITY = "density"

@dataclass
class MapLayer:
    """Represents a map layer with styling"""
    name: str
    data: Any  # GeoDataFrame, coordinates, or file path
    layer_type: str  # point, line, polygon, raster, marker
    style: Optional[Dict] = None
    popup_fields: Optional[List[str]] = None
    visible: bool = True

@dataclass
class MapConfig:
    """Configuration for map visualization"""
    center: Tuple[float, float]  # lat, lon
    zoom: int = 10
    width: int = 800
    height: int = 600
    provider: MapProvider = MapProvider.OPENSTREETMAP
    layers: List[MapLayer] = None
    title: Optional[str] = None
    
    def __post_init__(self):
        if self.layers is None:
            self.layers = []

@dataclass
class AnalysisRequest:
    """Request for spatial analysis"""
    analysis_type: AnalysisType
    input_data: Any  # GeoDataFrame or geometry
    parameters: Dict = None
    output_format: str = "geojson"  # geojson, shapefile, geotiff

class GISOperations:
    """Core GIS operations for spatial analysis"""
    
    @staticmethod
    def buffer_analysis(geometry, distance: float, unit: str = "meters") -> Any:
        """Create buffer around geometry"""
        if unit == "degrees":
            buffer_distance = distance
        else:
            # Convert meters to degrees (approximate)
            buffer_distance = distance / 111320.0
        
        if hasattr(geometry, 'buffer'):
            return geometry.buffer(buffer_distance)
        else:
            gdf = gpd.GeoDataFrame([1], geometry=[geometry])
            return gdf.geometry.buffer(buffer_distance).iloc[0]
    
    @staticmethod
    def intersection_analysis(geom1, geom2) -> Any:
        """Find intersection between geometries"""
        if hasattr(geom1, 'intersection'):
            return geom1.intersection(geom2)
        else:
            gdf1 = gpd.GeoDataFrame([1], geometry=[geom1])
            gdf2 = gpd.GeoDataFrame([1], geometry=[geom2])
            result = gpd.overlay(gdf1, gdf2, how='intersection')
            return result.geometry.iloc[0] if not result.empty else None
    
    @staticmethod
    def calculate_area(geometry, unit: str = "square_meters") -> float:
        """Calculate area of geometry"""
        if hasattr(geometry, 'area'):
            area = geometry.area
        else:
            gdf = gpd.GeoDataFrame([1], geometry=[geometry])
            area = gdf.geometry.area.iloc[0]
        
        if unit == "square_kilometers":
            return area / 1000000
        elif unit == "hectares":
            return area / 10000
        else:
            return area
    
    @staticmethod
    def nearest_neighbor(point, geometries, k: int = 1) -> List[Tuple[int, float]]:
        """Find k nearest neighbors to a point"""
        distances = []
        for i, geom in enumerate(geometries):
            dist = point.distance(geom)
            distances.append((i, dist))
        
        distances.sort(key=lambda x: x[1])
        return distances[:k]

class MapVisualizer:
    """Main map visualization class"""
    
    def __init__(self, postgres_url: str = None, mapbox_token: str = None):
        self.mapbox_token = mapbox_token
        
        # Initialize database connection
        if postgres_url:
            try:
                self.engine = create_engine(postgres_url)
                self.Session = sessionmaker(bind=self.engine)
                self.db_enabled = True
                logger.info("Database connection established for map visualizations")
            except Exception as e:
                logger.error(f"Failed to connect to database: {e}")
                self.db_enabled = False
        else:
            self.db_enabled = False
    
    def create_map(self, config: MapConfig, session_id: str = None) -> Tuple[str, str]:
        """Create an interactive map visualization"""
        try:
            # Create base map
            m = folium.Map(
                location=config.center,
                zoom_start=config.zoom,
                width=config.width,
                height=config.height
            )
            
            # Add tile layer based on provider
            if config.provider == MapProvider.SATELLITE:
                folium.TileLayer(
                    tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    attr='Esri',
                    name='Satellite',
                    overlay=False,
                    control=True
                ).add_to(m)
            elif config.provider == MapProvider.TERRAIN:
                folium.TileLayer(
                    tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
                    attr='Esri',
                    name='Terrain',
                    overlay=False,
                    control=True
                ).add_to(m)
            
            # Add layers
            for layer in config.layers:
                self._add_layer_to_map(m, layer)
            
            # Add layer control
            folium.LayerControl().add_to(m)
            
            # Generate map HTML
            map_html = m._repr_html_()
            
            # Save to database if enabled
            viz_id = None
            if self.db_enabled and session_id:
                viz_id = self._save_visualization(config, session_id, map_html)
            
            return map_html, viz_id
            
        except Exception as e:
            logger.error(f"Error creating map: {e}")
            raise
    
    def _add_layer_to_map(self, map_obj: folium.Map, layer: MapLayer):
        """Add a layer to the folium map"""
        try:
            if layer.layer_type == "marker":
                if isinstance(layer.data, list) and len(layer.data) == 2:
                    # Single point [lat, lon]
                    folium.Marker(
                        location=layer.data,
                        popup=layer.name,
                        tooltip=layer.name
                    ).add_to(map_obj)
                
            elif layer.layer_type == "polygon":
                if isinstance(layer.data, gpd.GeoDataFrame):
                    folium.GeoJson(
                        layer.data.to_json(),
                        name=layer.name,
                        style_function=lambda x, style=layer.style: style or {
                            'fillColor': 'blue',
                            'color': 'black',
                            'weight': 2,
                            'fillOpacity': 0.7
                        }
                    ).add_to(map_obj)
                
            elif layer.layer_type == "point":
                if isinstance(layer.data, gpd.GeoDataFrame):
                    for idx, row in layer.data.iterrows():
                        if row.geometry.geom_type == 'Point':
                            coords = [row.geometry.y, row.geometry.x]
                            popup_text = self._create_popup_text(row, layer.popup_fields)
                            folium.CircleMarker(
                                location=coords,
                                radius=8,
                                popup=popup_text,
                                color=layer.style.get('color', 'red') if layer.style else 'red',
                                fillColor=layer.style.get('fillColor', 'red') if layer.style else 'red',
                                fillOpacity=0.8
                            ).add_to(map_obj)
            
        except Exception as e:
            logger.error(f"Error adding layer {layer.name}: {e}")
    
    def _create_popup_text(self, row, popup_fields: List[str] = None) -> str:
        """Create popup text for map features"""
        if not popup_fields:
            return f"Feature {row.name if hasattr(row, 'name') else 'Unknown'}"
        
        popup_html = "<div style='font-family: Arial; font-size: 12px;'>"
        for field in popup_fields:
            if field in row.index:
                popup_html += f"<b>{field}:</b> {row[field]}<br>"
        popup_html += "</div>"
        return popup_html
    
    def perform_spatial_analysis(self, request: AnalysisRequest, session_id: str = None) -> Dict[str, Any]:
        """Perform spatial analysis operation"""
        try:
            start_time = pd.Timestamp.now()
            
            if request.analysis_type == AnalysisType.BUFFER:
                distance = request.parameters.get('distance', 1000)
                unit = request.parameters.get('unit', 'meters')
                result = GISOperations.buffer_analysis(request.input_data, distance, unit)
                
            elif request.analysis_type == AnalysisType.AREA:
                unit = request.parameters.get('unit', 'square_meters')
                if isinstance(request.input_data, gpd.GeoDataFrame):
                    areas = []
                    for geom in request.input_data.geometry:
                        area = GISOperations.calculate_area(geom, unit)
                        areas.append(area)
                    result = {"areas": areas, "total_area": sum(areas)}
                else:
                    result = {"area": GISOperations.calculate_area(request.input_data, unit)}
                    
            elif request.analysis_type == AnalysisType.INTERSECTION:
                geom2 = request.parameters.get('geometry2')
                result = GISOperations.intersection_analysis(request.input_data, geom2)
                
            else:
                raise ValueError(f"Unsupported analysis type: {request.analysis_type}")
            
            execution_time = pd.Timestamp.now() - start_time
            
            # Save analysis result to database
            analysis_id = None
            if self.db_enabled and session_id:
                analysis_id = self._save_analysis_result(
                    session_id=session_id,
                    analysis_type=request.analysis_type.value,
                    parameters=request.parameters,
                    result=result,
                    execution_time=execution_time
                )
            
            return {
                "analysis_id": analysis_id,
                "result": result,
                "execution_time": execution_time.total_seconds(),
                "status": "completed"
            }
            
        except Exception as e:
            logger.error(f"Error performing spatial analysis: {e}")
            return {
                "error": str(e),
                "status": "failed"
            }
    
    def geocode_address(self, address: str, provider: str = "nominatim") -> Optional[Dict]:
        """Geocode an address to coordinates"""
        try:
            # Check cache first if database is enabled
            if self.db_enabled:
                cached_result = self._get_cached_geocoding(address)
                if cached_result:
                    return cached_result
            
            # Use Nominatim for geocoding (free service)
            if provider == "nominatim":
                url = "https://nominatim.openstreetmap.org/search"
                params = {
                    'q': address,
                    'format': 'json',
                    'limit': 1,
                    'addressdetails': 1
                }
                headers = {'User-Agent': 'GeoGPT-RAG/1.0'}
                
                response = requests.get(url, params=params, headers=headers)
                data = response.json()
                
                if data:
                    result = {
                        'latitude': float(data[0]['lat']),
                        'longitude': float(data[0]['lon']),
                        'display_name': data[0]['display_name'],
                        'confidence': 1.0,
                        'provider': provider
                    }
                    
                    # Cache result if database is enabled
                    if self.db_enabled:
                        self._cache_geocoding_result(address, result)
                    
                    return result
            
            return None
            
        except Exception as e:
            logger.error(f"Error geocoding address '{address}': {e}")
            return None
    
    def create_analysis_map(self, geometries: List[Any], analysis_type: str, 
                          center: Tuple[float, float] = None) -> str:
        """Create a map specifically for showing analysis results"""
        try:
            # Auto-calculate center if not provided
            if not center and geometries:
                bounds = self._calculate_bounds(geometries)
                center = (
                    (bounds['north'] + bounds['south']) / 2,
                    (bounds['east'] + bounds['west']) / 2
                )
            
            if not center:
                center = (0, 0)
            
            # Create map configuration
            layers = []
            for i, geom in enumerate(geometries):
                if hasattr(geom, 'geom_type'):
                    layer_type = geom.geom_type.lower()
                    if layer_type == 'point':
                        layer_type = 'marker'
                        data = [geom.y, geom.x]
                    else:
                        # Convert to GeoDataFrame for complex geometries
                        gdf = gpd.GeoDataFrame([{'id': i}], geometry=[geom])
                        data = gdf
                        layer_type = 'polygon' if layer_type in ['polygon', 'multipolygon'] else 'line'
                else:
                    # Assume it's a coordinate pair
                    layer_type = 'marker'
                    data = geom
                
                layer = MapLayer(
                    name=f"{analysis_type.title()} Result {i+1}",
                    data=data,
                    layer_type=layer_type,
                    style={'color': f'hsl({i * 60 % 360}, 70%, 50%)'}
                )
                layers.append(layer)
            
            config = MapConfig(
                center=center,
                zoom=12,
                layers=layers,
                title=f"{analysis_type.title()} Analysis Results"
            )
            
            map_html, _ = self.create_map(config)
            return map_html
            
        except Exception as e:
            logger.error(f"Error creating analysis map: {e}")
            return f"<div>Error creating map: {str(e)}</div>"
    
    def _calculate_bounds(self, geometries: List[Any]) -> Dict[str, float]:
        """Calculate bounding box for geometries"""
        min_lat, max_lat = float('inf'), float('-inf')
        min_lon, max_lon = float('inf'), float('-inf')
        
        for geom in geometries:
            if hasattr(geom, 'bounds'):
                bounds = geom.bounds
                min_lon = min(min_lon, bounds[0])
                min_lat = min(min_lat, bounds[1])
                max_lon = max(max_lon, bounds[2])
                max_lat = max(max_lat, bounds[3])
            elif hasattr(geom, 'x') and hasattr(geom, 'y'):
                min_lon = min(min_lon, geom.x)
                max_lon = max(max_lon, geom.x)
                min_lat = min(min_lat, geom.y)
                max_lat = max(max_lat, geom.y)
        
        return {
            'north': max_lat,
            'south': min_lat,
            'east': max_lon,
            'west': min_lon
        }
    
    def _save_visualization(self, config: MapConfig, session_id: str, map_html: str) -> str:
        """Save map visualization to database"""
        try:
            session = self.Session()
            viz_id = str(uuid.uuid4())
            
            # Create visualization record (simplified - you'd adapt this to your schema)
            viz_data = {
                'viz_id': viz_id,
                'session_id': session_id,
                'title': config.title,
                'center_point': f"POINT({config.center[1]} {config.center[0]})",
                'zoom_level': config.zoom,
                'layers': [{'name': layer.name, 'type': layer.layer_type} for layer in config.layers],
                'style_config': {'provider': config.provider.value}
            }
            
            # Note: You'd need to adapt this to your actual database schema
            session.close()
            
            return viz_id
            
        except Exception as e:
            logger.error(f"Error saving visualization: {e}")
            return str(uuid.uuid4())
    
    def _save_analysis_result(self, session_id: str, analysis_type: str, 
                            parameters: Dict, result: Any, execution_time) -> str:
        """Save analysis result to database"""
        try:
            analysis_id = str(uuid.uuid4())
            # Implementation would depend on your database schema
            logger.info(f"Analysis {analysis_id} completed in {execution_time.total_seconds():.2f}s")
            return analysis_id
        except Exception as e:
            logger.error(f"Error saving analysis result: {e}")
            return str(uuid.uuid4())
    
    def _get_cached_geocoding(self, address: str) -> Optional[Dict]:
        """Get cached geocoding result"""
        # Implementation would query your geocoding cache table
        return None
    
    def _cache_geocoding_result(self, address: str, result: Dict):
        """Cache geocoding result"""
        # Implementation would insert into your geocoding cache table
        pass

# Global map visualizer instance
_map_visualizer = None

def get_map_visualizer() -> MapVisualizer:
    """Get or create global map visualizer instance"""
    global _map_visualizer
    if _map_visualizer is None:
        postgres_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
        mapbox_token = os.getenv("MAPBOX_ACCESS_TOKEN")
        
        _map_visualizer = MapVisualizer(
            postgres_url=postgres_url,
            mapbox_token=mapbox_token
        )
    return _map_visualizer

# Utility functions for common GIS operations
def create_simple_map(lat: float, lon: float, zoom: int = 10, 
                     markers: List[Tuple[float, float]] = None) -> str:
    """Create a simple map with optional markers"""
    visualizer = get_map_visualizer()
    
    layers = []
    if markers:
        for i, (marker_lat, marker_lon) in enumerate(markers):
            layer = MapLayer(
                name=f"Marker {i+1}",
                data=[marker_lat, marker_lon],
                layer_type="marker"
            )
            layers.append(layer)
    
    config = MapConfig(
        center=(lat, lon),
        zoom=zoom,
        layers=layers
    )
    
    map_html, _ = visualizer.create_map(config)
    return map_html

def analyze_geometry(geometry, analysis_type: str, **params) -> Dict[str, Any]:
    """Perform analysis on a geometry"""
    visualizer = get_map_visualizer()
    
    request = AnalysisRequest(
        analysis_type=AnalysisType(analysis_type),
        input_data=geometry,
        parameters=params
    )
    
    return visualizer.perform_spatial_analysis(request) 