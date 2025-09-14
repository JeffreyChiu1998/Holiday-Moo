#!/usr/bin/env python3
"""
AWS Lambda function for Holiday Moo Calendar Excel Export Service

This Lambda function handles Excel export requests from the React app.
"""

import json
import base64
import boto3
from datetime import datetime
import sys
import os

# Add the services directory to the path
sys.path.append('/opt/python')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the exporter class (Lambda-specific version)
try:
    from excelExportService_lambda import TravelCalendarExporter
except ImportError:
    # Create a minimal version if import fails
    class TravelCalendarExporter:
        def create_excel_export(self, calendar_data, trip_data):
            raise Exception("Excel export service not available")
        def generate_filename(self, title, name, start, end):
            return "export.xlsx"

def lambda_handler(event, context):
    """
    AWS Lambda handler for Excel export requests
    """
    
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Accept',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PUT,DELETE',
        'Access-Control-Allow-Credentials': 'false',
        'Content-Type': 'application/json'
    }
    
    try:
        # Handle preflight OPTIONS request
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        # Parse request body
        if event.get('body'):
            if event.get('isBase64Encoded'):
                body = base64.b64decode(event['body']).decode('utf-8')
            else:
                body = event['body']
            
            try:
                request_data = json.loads(body)
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {str(e)}")
                print(f"Body content: {body}")
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': f'Invalid JSON: {str(e)}'})
                }
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Missing request body'})
            }
        
        # Log received data for debugging
        print(f"Received request data keys: {list(request_data.keys())}")
        print(f"Request data: {json.dumps(request_data, indent=2)}")
        
        # Validate required fields
        required_fields = ['calendarData', 'tripData']
        for field in required_fields:
            if field not in request_data:
                print(f"Missing required field: {field}")
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': f'Missing required field: {field}. Received fields: {list(request_data.keys())}'})
                }
        
        # Extract data
        calendar_data = request_data['calendarData']
        trip_data = request_data['tripData']
        
        # Create exporter instance
        exporter = TravelCalendarExporter()
        
        # Generate Excel file
        excel_data = exporter.create_excel_export(calendar_data, trip_data)
        
        # Generate filename
        filename = exporter.generate_filename(
            calendar_data.get('title', 'Calendar'),
            trip_data.get('name', 'Trip'),
            trip_data.get('startDate', ''),
            trip_data.get('endDate', '')
        )
        
        # Encode Excel data as base64
        excel_base64 = base64.b64encode(excel_data).decode('utf-8')
        
        # Return response
        return {
            'statusCode': 200,
            'headers': {
                **headers,
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': True,
                'filename': filename,
                'data': excel_base64,
                'size': len(excel_data)
            })
        }
        
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

def health_check(event, context):
    """
    Health check endpoint for the Lambda function
    """
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'status': 'healthy',
            'service': 'Holiday Moo Excel Export Service',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0'
        })
    }