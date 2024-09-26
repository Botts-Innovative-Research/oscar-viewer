# Step 1: Use a Node.js base image to build the React application
FROM node:18 AS build

# Step 2: Set the working directory inside the container
WORKDIR /app

# Step 3: Copy package files to the working directory
COPY package.json package-lock.json ./

# Step 4: Clear npm cache and install dependencies with verbose logging
RUN npm cache clean --force && npm install --verbose

# Step 5: Copy the application code to the working directory
COPY . .

# Step 6: Build the React application
RUN npm run build

# Step 7: Use a lightweight web server to serve the built application
FROM nginx:alpine

# Step 8: Copy the build output to the nginx server directory
COPY --from=build /app/out /usr/share/nginx/html

# Step 9: Expose the necessary port
EXPOSE 80

# Step 10: Start the nginx server
ENTRYPOINT ["nginx", "-g", "daemon off;"]
