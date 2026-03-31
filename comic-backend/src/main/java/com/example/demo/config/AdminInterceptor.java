package com.example.demo.config;

import com.example.demo.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class AdminInterceptor implements HandlerInterceptor {

    private final JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        
        String method = request.getMethod();
        // Allow CORS Pre-flight checks unconditionally
        if (method.equalsIgnoreCase("OPTIONS")) {
            return true;
        }
        
        String uri = request.getRequestURI();

        // Exclude GET requests for regular users reading comics
        if (uri.startsWith("/api/comics") && method.equalsIgnoreCase("GET")) {
            return true;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isValidToken(token)) {
                String role = jwtUtil.extractRole(token);
                if ("ADMIN".equals(role)) {
                    return true;
                }
            }
        }
        
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setHeader("Content-Type", "application/json;charset=UTF-8");
        response.getWriter().write("{\"message\": \"Unauthorized: Quyền truy cập bị từ chối, Token JWT rỗng hoặc không có quyền Admin.\"}");
        return false;
    }
}
