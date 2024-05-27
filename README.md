n8n-nodes-puppeteer-screen-recorder
This is an n8n community node that lets you record websites using Puppeteer and puppeteer-screen-recorder directly in your n8n workflows.
Puppeteer is a Node.js library which provides a high-level API to control Chrome/Chromium over the DevTools Protocol. This node uses Puppeteer along with the puppeteer-screen-recorder plugin to record the screen of a website loaded in headless Chrome/Chromium.
n8n is a fair-code licensed workflow automation platform.
Installation
Operations
Compatibility
Usage
Resources
Installation
Follow the installation guide in the n8n community nodes documentation.
After installing the node in your n8n instance, you also need to ensure you have Chromium and necessary dependencies installed as the node uses Puppeteer to launch and control Chromium.
If using n8n in Docker, you can use a Dockerfile similar to this to add the required dependencies:
dockerfileCopy codeFROM n8nio/n8n:latest

USER root

# Install necessary dependencies for Chromium 
RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    ttf-freefont

# Set environment variables
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER node
For other installation methods, refer to the Puppeteer troubleshooting docs on how to install Chromium/Chrome dependencies for your platform.
Operations
The node supports a single operation:

Record website: Records the screen of a specified website URL for a given duration and saves the recording as an MP4 video file.

Compatibility
Minimum n8n version: 0.125.0
Tested against n8n version: 0.125.0
The node requires Puppeteer which uses a recent version of Chromium/Chrome (usually the latest or latest-1 version). Ensure your environment has a compatible browser version installed.
Usage

Install the node and add it to your workflow.
Enter the website URL you want to record in the URL field.
Specify the Width and Height for the viewport size for the recording. Default is 1280x720.
Set the Duration in seconds for how long to record the screen after loading the page. Default is 5 seconds.
Optionally change the Frame Rate of the recording. Default is 25 fps.
Specify a name for the Output File Name for the recording. Default is recording.mp4.
Execute the node.

The node will launch a headless browser, load the specified URL, start the recording, wait for the specified duration, stop the recording, and save the MP4 file with the provided name. The recording file will be returned as binary data in the node output.
