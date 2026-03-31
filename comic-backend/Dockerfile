# Stage 1: Build the application using Maven Image
FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy source code
COPY pom.xml ./
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Stage 2: Create a minimal image
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy file jar từ bước build sang
COPY --from=builder /app/target/*.jar app.jar

# Expose port (Render sẽ tự gán biến PORT từ application.properties)
EXPOSE 8080

# Chạy ứng dụng - Giới hạn RAM cho Render Free Tier (512MB)
ENTRYPOINT ["java", "-Xmx400m", "-Xms256m", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
