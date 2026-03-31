# Stage 1: Build the application using Maven Wrapper
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app

# Khuyến cáo cấu hình maven daemon để build nhanh hơn nếu có
# Nhép file wrapper và pom.xml vào trước
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Cấp quyền thực thi cho Maven wrapper
RUN chmod +x ./mvnw

# Tải dependencies (lưu catch vào layer docker)
RUN ./mvnw dependency:go-offline

# Nhép toàn bộ code vào và build
COPY src ./src
RUN ./mvnw clean package -DskipTests

# Stage 2: Create a minimal image
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy file jar từ bước build sang
COPY --from=builder /app/target/*.jar app.jar

# Expose port (Render sẽ tự gán biến PORT từ application.properties)
EXPOSE 8080

# Chạy ứng dụng
ENTRYPOINT ["java", "-jar", "app.jar"]
