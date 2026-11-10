program fizzbuzz
    implicit none
    integer :: n, i

    read (*, *) n

    do i = 1, n
        if (mod(i, 15) == 0) then
            print '(A)', 'FizzBuzz'
        else if (mod(i, 3) == 0) then
            print '(A)', 'Fizz'
        else if (mod(i, 5) == 0) then
            print '(A)', 'Buzz'
        else
            print '(I0)', i
        end if
    end do
end program fizzbuzz
