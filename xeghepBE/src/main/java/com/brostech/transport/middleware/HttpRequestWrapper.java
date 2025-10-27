package com.brostech.transport.middleware;

import com.brostech.transport.common.factory.LoggingFactory;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.Part;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.springframework.util.StreamUtils;

import java.io.*;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;;


public class HttpRequestWrapper extends HttpServletRequestWrapper {

    private static final Logger log = LoggingFactory.getLogger(HttpRequestWrapper.class);

    private byte[] bodyBytes;

    private Collection<Part> parts;

    public HttpRequestWrapper(HttpServletRequest request) {
        super(request);
        try {
            this.parts = cloneParts(request);
            InputStream requestInputStream = request.getInputStream();
            this.bodyBytes = StreamUtils.copyToByteArray(requestInputStream);
        } catch (Exception e) {
            log.error("[ERROR] Lỗi khi sao chép HttpServletRequest {}", e.getMessage());
        }
    }

    @Override
    public BufferedReader getReader() {
        ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(bodyBytes);
        InputStreamReader inputStreamReader = new InputStreamReader(byteArrayInputStream);
        return new BufferedReader(inputStreamReader);
    }

    @Override
    public ServletInputStream getInputStream() throws IOException {
        ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(bodyBytes);
        return new HttpServletRequestWrapper(byteArrayInputStream);
    }

    @Override
    public Collection<Part> getParts() {
        return parts;
    }

    private Collection<Part> cloneParts(HttpServletRequest request) {
        String contentType = getRequestHeader(request, "content-type");
        if (contentType == null || !contentType.contains("multipart/form-data")) {
            return Collections.emptyList();
        }
        Collection<Part> clonedParts = new ArrayList<>();
        try {
            clonedParts.addAll(request.getParts());
        } catch (Exception e) {
            log.info("[REQUEST] Không lấy được thông tin request multifile {}", e.getMessage());
        }
        return clonedParts;
    }

    private String getRequestHeader(HttpServletRequest httpServletRequest, String name) {
        try {
            var value = httpServletRequest.getHeader(name);
            return StringUtils.isBlank(value) ? "" : value;
        } catch (Exception e) {
            return StringUtils.EMPTY;
        }
    }

    private static class HttpServletRequestWrapper extends ServletInputStream {
        private final ByteArrayInputStream inputStream;

        public HttpServletRequestWrapper(ByteArrayInputStream inputStream) {
            this.inputStream = inputStream;
        }

        @Override
        public int read() throws IOException {
            return inputStream.read();
        }

        @Override
        public int read(byte[] b) throws IOException {
            return inputStream.read(b);
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            return inputStream.read(b, off, len);
        }

        @Override
        public boolean isFinished() {
            return inputStream.available() == 0;
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setReadListener(ReadListener readListener) {
            // Không cần triển khai cho trường hợp này
        }
    }
}


