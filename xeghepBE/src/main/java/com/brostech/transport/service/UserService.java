package com.brostech.transport.service;

import com.brostech.transport.dto.user.UserDTO;
import com.brostech.transport.dto.user.CreateUserRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Interface Service xử lý nghiệp vụ liên quan đến người dùng
 * Bao gồm: đăng nhập, quản lý thông tin người dùng
 */
public interface UserService {
    /**
     * Xác thực đăng nhập người dùng
     * @param username tên đăng nhập
     * @param password mật khẩu
     * @return thông tin người dùng nếu xác thực thành công
     */
    UserDTO login(String username, String password);
    
    /**
     * Đổi mật khẩu người dùng
     * @param userId ID người dùng
     * @param oldPassword mật khẩu cũ
     * @param newPassword mật khẩu mới
     */
    void changePassword(Long userId, String oldPassword, String newPassword);
    
    /**
     * Tạo mới người dùng
     * @param request thông tin người dùng mới
     * @return thông tin người dùng đã được tạo
     */
    UserDTO createUser(CreateUserRequest request);
    
    /**
     * Cập nhật thông tin người dùng
     * @param id ID người dùng cần cập nhật
     * @param request thông tin cần cập nhật
     * @return thông tin người dùng sau khi cập nhật
     */
    UserDTO updateUser(Long id, CreateUserRequest request);
    
    /**
     * Xóa người dùng
     * @param id ID người dùng cần xóa
     */
    void deleteUser(Long id);
    
    /**
     * Lấy thông tin người dùng theo ID
     * @param id ID người dùng
     * @return thông tin người dùng
     */
    UserDTO getUserById(Long id);
    
    /**
     * Lấy danh sách người dùng (phân trang, tìm kiếm)
     * @param keyword từ khóa tìm kiếm
     * @param pageable thông tin phân trang
     * @return danh sách người dùng
     */
    Page<UserDTO> getAllUsers(String keyword, Pageable pageable);
}
