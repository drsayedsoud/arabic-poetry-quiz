import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const filePath = path.join(process.cwd(), 'src/data/offlineData.json');
    
    // Read existing
    let currentData = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      currentData = JSON.parse(fileContent);
    }
    
    // Append the new question
    currentData.push(data);
    
    // Write back to the file
    fs.writeFileSync(filePath, JSON.stringify(currentData, null, 4), 'utf-8');
    
    return NextResponse.json({ success: true, count: currentData.length });
  } catch (error: any) {
    console.error("Failed to save offline data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
